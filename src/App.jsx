import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, configError } from './lib/supabase.js'
import { fetchDashboard, fetchMyRole } from './lib/data.js'
import { isCurrent } from './lib/display.js'
import { assessFlags } from './lib/flags.js'
import Login from './components/Login.jsx'
import TopBar from './components/TopBar.jsx'
import Overview from './components/Overview.jsx'
import FlagBoard from './components/FlagBoard.jsx'
import Register from './components/Register.jsx'
import SupplierDetail from './components/SupplierDetail.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import ChangePassword from './components/ChangePassword.jsx'
import { ErrorMessage } from './components/ui.jsx'

// The dashboard's client-side views. Anything else is the dashboard itself.
const ADMIN_PATH = '/admin'
const PASSWORD_PATH = '/password'

const NO_ACCESS_NOTICE = 'This login does not have access to the dashboard.'

export default function App() {
  const [session, setSession] = useState(null)
  // The user's own user_roles row. Decides only what the screen shows; the
  // database and the admin function enforce the same rules on every request.
  const [me, setMe] = useState(null)
  const [loginNotice, setLoginNotice] = useState('')
  const [path, setPath] = useState(() => window.location.pathname)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState({ companies: [], submissions: [] })
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [openSubmissionId, setOpenSubmissionId] = useState(null)

  // Auth gate. Until this resolves nothing is rendered and, more importantly,
  // nothing is fetched: no supplier data is requested before login.
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return undefined
    }
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        // Logging out drops everything already loaded, so pressing back shows
        // no supplier data.
        setData({ companies: [], submissions: [] })
        setOpenSubmissionId(null)
        setMe(null)
      }
    })
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (window.location.pathname !== to) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
    }
    setPath(to)
    setOpenSubmissionId(null)
  }, [])

  // A login that is not on the team, or that the Admin has deactivated, is
  // signed out on the spot and sees nothing but the Login view.
  const refreshRole = useCallback(async () => {
    const role = await fetchMyRole()
    if (role.access !== 'ok') {
      setLoginNotice(NO_ACCESS_NOTICE)
      await supabase.auth.signOut()
      return null
    }
    setMe(role)
    return role
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const role = await refreshRole()
      if (!role) return
      setData(await fetchDashboard())
      setLoadError('')
    } catch {
      setLoadError('The dashboard could not be loaded. Try again.')
    } finally {
      setLoading(false)
    }
  }, [refreshRole])

  useEffect(() => {
    if (session) load()
  }, [session, load])

  // Re-read the role whenever the tab regains focus, so a reassignment shows
  // (controls appear or disappear) without logging out.
  useEffect(() => {
    if (!session) return undefined
    const onFocus = () => {
      refreshRole().catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [session, refreshRole])

  // The Admin Panel has no route for anyone else: a direct visit lands on the
  // Dashboard. The roster behind it is only ever served by the admin function.
  useEffect(() => {
    if (me && path === ADMIN_PATH && !me.is_admin) navigate('/', { replace: true })
  }, [me, path, navigate])

  const companiesById = useMemo(
    () => new Map(data.companies.map((c) => [c.id, c])),
    [data.companies],
  )

  const currentSubmissions = useMemo(
    () => data.submissions.filter(isCurrent),
    [data.submissions],
  )

  // One register row per current submission, so a company current on both
  // routes appears twice. Rows without a company are dropped rather than
  // rendered blank — the FK makes that impossible in practice.
  const registerRows = useMemo(
    () =>
      currentSubmissions
        .map((submission) => ({ submission, company: companiesById.get(submission.company_id) }))
        .filter((row) => row.company),
    [currentSubmissions, companiesById],
  )

  // One flag-board row per company that has any current submission.
  const flagRows = useMemo(() => {
    const byCompany = new Map()
    for (const submission of currentSubmissions) {
      const company = companiesById.get(submission.company_id)
      if (!company) continue
      if (!byCompany.has(company.id)) byCompany.set(company.id, { company, questionnaire: null })
      if (submission.path === 'full') byCompany.get(company.id).questionnaire = submission
    }
    return [...byCompany.values()].map(({ company, questionnaire }) => ({
      company,
      assessment: assessFlags(questionnaire),
    }))
  }, [currentSubmissions, companiesById])

  const openSubmission = data.submissions.find((s) => s.id === openSubmissionId) ?? null
  const openCompany = openSubmission ? companiesById.get(openSubmission.company_id) : null

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (!authReady) {
    return <div className="min-h-screen bg-mint" />
  }

  // Every logged-out visitor sees the Login view, whatever the URL.
  if (configError || !session) {
    return <Login notice={loginNotice} onSignIn={() => setLoginNotice('')} />
  }

  // Nothing renders until the role is known, so no control flashes up for a
  // Procurement login before it is hidden.
  if (!me) {
    return (
      <div className="min-h-screen bg-mint px-4 py-8">
        <ErrorMessage>{loadError}</ErrorMessage>
      </div>
    )
  }

  const canReview = me.is_active && (me.role === 'ehs' || me.role === 'esg')
  const view =
    path === ADMIN_PATH && me.is_admin ? 'admin' : path === PASSWORD_PATH ? 'password' : 'dashboard'

  return (
    <div className="min-h-screen bg-mint">
      <TopBar
        email={session.user?.email ?? ''}
        role={me.role}
        isAdmin={me.is_admin}
        view={view}
        onLogout={handleLogout}
        onNavigate={navigate}
        showAnchors={view === 'dashboard' && !openSubmission}
      />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <ErrorMessage>{loadError}</ErrorMessage>

        {view === 'admin' ? (
          <AdminPanel myRoleId={me.id} onChanged={refreshRole} />
        ) : view === 'password' ? (
          <ChangePassword onDone={() => navigate('/')} />
        ) : loading && data.submissions.length === 0 ? (
          <p className="text-sm text-deep-60">Loading…</p>
        ) : openSubmission && openCompany ? (
          <SupplierDetail
            submission={openSubmission}
            company={openCompany}
            others={data.submissions
              .filter(
                (s) => s.company_id === openSubmission.company_id && s.id !== openSubmission.id,
              )
              .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1))}
            onBack={() => setOpenSubmissionId(null)}
            onOpen={setOpenSubmissionId}
            onRefresh={load}
            canReview={canReview}
          />
        ) : (
          <>
            <Overview currentSubmissions={currentSubmissions} />
            <FlagBoard rows={flagRows} />
            <Register rows={registerRows} onOpen={setOpenSubmissionId} />
          </>
        )}
      </main>
    </div>
  )
}
