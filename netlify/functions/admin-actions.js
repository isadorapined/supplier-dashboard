import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'node:crypto'

// The dashboard's only server-side code: the Admin Panel's actions. It holds
// the service role key, which bypasses RLS, so for this path the function IS
// the access rule (docs/access-matrix.md §6 line 9). On every call it checks,
// itself, that the caller has a live session AND currently holds Admin on an
// active user_roles row — it never trusts the UI having hidden a button.
//
// The database backs it up: user_roles refuses zero or two Admins, an Admin
// who is inactive or Procurement, and every direct write from a browser.

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const ROLES = ['ehs', 'esg', 'procurement']
const ROSTER_COLUMNS = 'id, auth_user_id, email, role, is_admin, is_active, created_at'
// Long enough to be a real password, without characters that are easy to
// misread when it is handed over in person.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const BANNED_FOR = '876000h' // about 100 years: banned until reactivated

class Refusal extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

function starterPassword() {
  let out = ''
  for (let i = 0; i < 16; i += 1) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]
  return out
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
}

async function roster(admin) {
  const { data, error } = await admin
    .from('user_roles')
    .select(ROSTER_COLUMNS)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

async function rowById(admin, id) {
  if (!isUuid(id)) throw new Refusal(400, 'That team member was not found. Nothing was changed.')
  const { data, error } = await admin.from('user_roles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Refusal(404, 'That team member was not found. Nothing was changed.')
  return data
}

// Nobody changes their own role or active flag, Admin included
// (access matrix §7 rule 2). Moving Admin away is the one self-change allowed.
function refuseSelf(caller, target) {
  if (caller.id === target.id) {
    throw new Refusal(403, 'You cannot change your own account here. Nothing was changed.')
  }
}

async function invite(admin, { email, role }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Refusal(400, 'Enter a valid email address. Nothing was changed.')
  }
  if (!ROLES.includes(role)) throw new Refusal(400, 'Choose a role. Nothing was changed.')

  const password = starterPassword()
  const created = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
  })
  if (created.error) {
    // Includes an address that already has a login — for example a supplier
    // who verified it on the portal. The two tools' accounts stay separate.
    const exists = /already|registered|exists/i.test(created.error.message ?? '')
    throw new Refusal(
      exists ? 409 : 502,
      exists
        ? 'A login with this email already exists. Nothing was changed.'
        : 'The login could not be created. Nothing was changed.',
    )
  }

  const userId = created.data.user.id
  const { error } = await admin
    .from('user_roles')
    .insert({ auth_user_id: userId, email: cleanEmail, role })
  if (error) {
    // Undo the half-made login so the action leaves no partial effect.
    await admin.auth.admin.deleteUser(userId)
    throw new Refusal(502, 'The team member could not be added. Nothing was changed.')
  }
  return { password }
}

async function setActive(admin, caller, { id, active }) {
  const target = await rowById(admin, id)
  refuseSelf(caller, target)
  if (typeof active !== 'boolean') throw new Refusal(400, 'Nothing was changed.')
  if (target.is_active === active) return {}

  // The ban is what ends an already-open session's next refresh; the flag is
  // what every RLS policy and set_submission_status() read on each request.
  const ban = await admin.auth.admin.updateUserById(target.auth_user_id, {
    ban_duration: active ? 'none' : BANNED_FOR,
  })
  if (ban.error) throw new Refusal(502, 'Access could not be changed. Nothing was changed.')

  const { error } = await admin.from('user_roles').update({ is_active: active }).eq('id', target.id)
  if (error) {
    await admin.auth.admin.updateUserById(target.auth_user_id, {
      ban_duration: active ? BANNED_FOR : 'none',
    })
    throw new Refusal(
      409,
      target.is_admin
        ? 'The Admin cannot be deactivated. Move Admin to someone else first. Nothing was changed.'
        : 'Access could not be changed. Nothing was changed.',
    )
  }
  return {}
}

async function resetPassword(admin, caller, { id }) {
  const target = await rowById(admin, id)
  refuseSelf(caller, target)
  const password = starterPassword()
  const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, { password })
  if (error) throw new Refusal(502, 'The password could not be reset. Nothing was changed.')
  return { password }
}

async function setRole(admin, caller, { id, role }) {
  const target = await rowById(admin, id)
  refuseSelf(caller, target)
  if (!ROLES.includes(role)) throw new Refusal(400, 'Choose a role. Nothing was changed.')
  const { error } = await admin.from('user_roles').update({ role }).eq('id', target.id)
  if (error) throw new Refusal(409, 'The role could not be changed. Nothing was changed.')
  return {}
}

async function moveAdmin(admin, caller, { id }) {
  const target = await rowById(admin, id)
  if (target.id === caller.id) throw new Refusal(400, 'You already hold Admin. Nothing was changed.')
  if (!target.is_active || !['ehs', 'esg'].includes(target.role)) {
    throw new Refusal(
      409,
      'Admin can only move to an active EHS or ESG account. Nothing was changed.',
    )
  }

  // One statement, so the database sees revoke and grant together: at no
  // point are there zero or two Admins. The current holder goes first so the
  // one-Admin index never sees two.
  const rows = [caller, target].map((row) => ({
    id: row.id,
    auth_user_id: row.auth_user_id,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    is_admin: row.id === target.id,
  }))
  const { error } = await admin.from('user_roles').upsert(rows, { onConflict: 'id' })
  if (error) throw new Refusal(409, 'Admin could not be moved. Nothing was changed.')
  return {}
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' })
  if (!url || !serviceKey) {
    return json(500, { error: 'The admin function is not configured on the server.' })
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    // 1. Who is calling? A valid session, checked with Supabase — not a claim
    //    the browser makes about itself.
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) throw new Refusal(401, 'Not signed in.')
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) throw new Refusal(401, 'Not signed in.')

    // 2. Do they hold Admin right now? A live read, so a moved or revoked
    //    Admin is refused on their very next call.
    const { data: caller, error: callerError } = await admin
      .from('user_roles')
      .select('*')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()
    if (callerError) throw callerError
    if (!caller || !caller.is_admin || !caller.is_active) {
      throw new Refusal(403, 'Only the Admin can do this.')
    }

    let body = {}
    try {
      body = await req.json()
    } catch {
      throw new Refusal(400, 'Nothing was changed.')
    }

    let result = {}
    switch (body.action) {
      case 'list':
        break
      case 'invite':
        result = await invite(admin, body)
        break
      case 'set_active':
        result = await setActive(admin, caller, body)
        break
      case 'reset_password':
        result = await resetPassword(admin, caller, body)
        break
      case 'set_role':
        result = await setRole(admin, caller, body)
        break
      case 'move_admin':
        result = await moveAdmin(admin, caller, body)
        break
      default:
        throw new Refusal(400, 'Unknown action. Nothing was changed.')
    }

    // Every response carries the fresh roster, so the panel always redraws
    // from the database rather than from what it assumed happened.
    return json(200, { ...result, roster: await roster(admin) })
  } catch (err) {
    if (err instanceof Refusal) return json(err.status, { error: err.message })
    return json(500, { error: 'Something went wrong. Nothing was changed.' })
  }
}
