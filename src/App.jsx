import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, configError } from './lib/supabase.js'
import { fetchDashboard } from './lib/data.js'
import { isCurrent } from './lib/display.js'
import { assessFlags } from './lib/flags.js'
import Login from './components/Login.jsx'
import TopBar from './components/TopBar.jsx'
import Overview from './components/Overview.jsx'
import FlagBoard from './components/FlagBoard.jsx'
import Register from './components/Register.jsx'
import SupplierDetail from './components/SupplierDetail.jsx'
import { ErrorMessage } from './components/ui.jsx'

export default function App() {
  const [session, setSession] = useState(null)
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
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchDashboard())
      setLoadError('')
    } catch {
      setLoadError('The dashboard could not be loaded. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) load()
  }, [session, load])

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
    return <Login />
  }

  return (
    <div className="min-h-screen bg-mint">
      <TopBar
        email={session.user?.email ?? ''}
        onLogout={handleLogout}
        onHome={() => setOpenSubmissionId(null)}
        showAnchors={!openSubmission}
      />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <ErrorMessage>{loadError}</ErrorMessage>

        {loading && data.submissions.length === 0 ? (
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
