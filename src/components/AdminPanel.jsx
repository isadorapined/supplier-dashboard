import { useEffect, useState } from 'react'
import { adminAction, ROLE_LABELS } from '../lib/data.js'
import { formatTimestamp, isValidEmail } from '../lib/format.js'
import { Button, EmptyRow, ErrorMessage, Field, Panel, SectionHeading, Table, inputClass } from './ui.jsx'

// View 4. Rendered only for the current Admin (App guards the route), and the
// data behind it comes only from the admin function, which checks Admin again
// on every call. Every action redraws the table from the function's response.

const ROLE_OPTIONS = ['ehs', 'esg', 'procurement']

function yesNo(value) {
  return value ? 'Yes' : 'No'
}

// A starter password, shown once. It is never stored in the page beyond this
// notice and is gone when the notice is dismissed.
function PasswordNotice({ notice, onDismiss }) {
  if (!notice) return null
  return (
    <Panel as="div" className="space-y-2 border-teal p-4">
      <p className="text-sm text-deep">
        Starter password for <span className="font-medium">{notice.email}</span>:
      </p>
      <p className="select-all font-mono text-lg text-deep">{notice.password}</p>
      <p className="text-sm text-deep-60">
        Hand it to them directly, in person or by message. It will not be shown again.
      </p>
      <Button variant="secondary" onClick={onDismiss}>
        Done
      </Button>
    </Panel>
  )
}

function InviteForm({ busy, onInvite }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const canInvite = isValidEmail(email.trim()) && role !== '' && !busy

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canInvite) return
    const ok = await onInvite(email.trim(), role)
    if (ok) {
      setEmail('')
      setRole('')
    }
  }

  return (
    <Panel as="form" className="p-4" onSubmit={handleSubmit} noValidate>
      <h3 className="mb-3 text-base text-deep">Invite a team member</h3>
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <Field label="Email" htmlFor="invite-email">
          <input
            id="invite-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <select
            id="invite-role"
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Choose a role</option>
            {ROLE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" disabled={!canInvite}>
          Invite
        </Button>
      </div>
    </Panel>
  )
}

export default function AdminPanel({ myRoleId, onChanged }) {
  const [roster, setRoster] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  async function run(action, params) {
    setBusy(true)
    setError('')
    try {
      const result = await adminAction(action, params)
      setRoster(result.roster ?? [])
      return result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setBusy(false)
      setLoaded(true)
    }
  }

  useEffect(() => {
    run('list')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInvite(email, role) {
    const result = await run('invite', { email, role })
    if (result?.password) setNotice({ email, password: result.password })
    return Boolean(result)
  }

  async function handleReset(row) {
    if (!window.confirm(`Reset the password for ${row.email}? Their current password stops working.`)) {
      return
    }
    const result = await run('reset_password', { id: row.id })
    if (result?.password) setNotice({ email: row.email, password: result.password })
  }

  async function handleActive(row) {
    const active = !row.is_active
    if (!active && !window.confirm(`Deactivate ${row.email}? They are signed out and cannot log in.`)) {
      return
    }
    await run('set_active', { id: row.id, active })
  }

  async function handleRole(row, role) {
    if (role === row.role) return
    await run('set_role', { id: row.id, role })
  }

  async function handleMoveAdmin(row) {
    if (!window.confirm(`Move Admin to ${row.email}? You keep your review rights but lose the Admin Panel.`)) {
      return
    }
    const result = await run('move_admin', { id: row.id })
    // Re-reading the role takes this screen away from the former Admin.
    if (result) await onChanged()
  }

  return (
    <section className="space-y-6">
      <SectionHeading id="admin" note="Only the Admin sees this page">
        Admin Panel
      </SectionHeading>

      <PasswordNotice notice={notice} onDismiss={() => setNotice(null)} />
      <InviteForm busy={busy} onInvite={handleInvite} />
      <ErrorMessage>{error}</ErrorMessage>

      <Table>
        <thead>
          <tr>
            {['Email', 'Role', 'Admin', 'Active', 'Invited on', 'Actions'].map((label) => (
              <th key={label} scope="col" className="bg-silver px-3 py-2 font-medium text-deep">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!loaded ? (
            <EmptyRow colSpan={6}>Loading…</EmptyRow>
          ) : roster.length === 0 ? (
            <EmptyRow colSpan={6}>No team members to show.</EmptyRow>
          ) : (
            roster.map((row) => {
              const isMe = row.id === myRoleId
              const canTakeAdmin =
                !row.is_admin && row.is_active && (row.role === 'ehs' || row.role === 'esg')
              return (
                <tr key={row.id} className="border-t border-deep-12 bg-mint align-middle">
                  <td className="px-3 py-2 text-deep">
                    {row.email}
                    {isMe ? <span className="text-deep-60"> (you)</span> : null}
                  </td>
                  <td className="px-3 py-2 text-deep">
                    {/* Nobody changes their own role, the Admin included. The
                        Admin's own role can't become Procurement either. */}
                    {isMe || row.is_admin ? (
                      ROLE_LABELS[row.role]
                    ) : (
                      <select
                        aria-label={`Role for ${row.email}`}
                        className={`${inputClass} w-auto py-1`}
                        value={row.role}
                        disabled={busy}
                        onChange={(e) => handleRole(row, e.target.value)}
                      >
                        {ROLE_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2 text-deep">{yesNo(row.is_admin)}</td>
                  <td className="px-3 py-2 text-deep">{yesNo(row.is_active)}</td>
                  <td className="px-3 py-2 text-deep">{formatTimestamp(row.created_at)}</td>
                  <td className="px-3 py-2">
                    {/* The Admin's own row has no deactivate, reset or
                        remove-Admin control: Admin only leaves by moving. */}
                    {isMe ? (
                      <span className="text-xs text-deep-60">
                        To step down, make someone else Admin.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="px-3 py-1"
                          disabled={busy}
                          onClick={() => handleActive(row)}
                        >
                          {row.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-3 py-1"
                          disabled={busy || !row.is_active}
                          onClick={() => handleReset(row)}
                        >
                          Reset password
                        </Button>
                        {canTakeAdmin ? (
                          <Button
                            variant="secondary"
                            className="px-3 py-1"
                            disabled={busy}
                            onClick={() => handleMoveAdmin(row)}
                          >
                            Make Admin
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </Table>

      <p className="text-xs text-deep-60">
        Admin can only sit on an active EHS or ESG account, and there is always exactly one.
        Deactivated accounts are kept, never deleted, and can be reactivated.
      </p>
    </section>
  )
}
