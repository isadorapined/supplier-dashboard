import { useEffect, useState } from 'react'
import { formatTimestamp } from '../lib/format.js'
import { doorLabel, routeLabel, statusLabel } from '../lib/display.js'
import { fetchStatusHistory, setSubmissionStatus } from '../lib/data.js'
import SubmissionContent from './SubmissionContent.jsx'
import { Button, ErrorMessage, Panel, StatusBadge, TextLink, inputClass } from './ui.jsx'

// View 3.

function Identity({ company, submission }) {
  const rows = [
    ['Company legal name', company.legal_name],
    ['Registered country', company.registered_country],
    ['Contact name', company.contact_name],
    ['Contact title', company.contact_title],
    ['Contact email', company.contact_email],
    ['Submission date', formatTimestamp(submission.submitted_at)],
  ]
  return (
    <Panel as="div" className="p-4">
      <h3 className="mb-3 text-base text-deep">Identity</h3>
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-deep-60">{label}</dt>
            <dd className="text-sm text-deep">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-deep-12 pt-3 text-xs text-deep-60">
        The portal overwrites a company&apos;s contact details on every new submission. The contact
        shown is the company&apos;s latest contact on file, which may differ from the contact at the
        time an older submission was made. Contact details are not stored per submission.
      </p>
    </Panel>
  )
}

function StatusPanel({ submission, supersededBy, canReview, onSaved }) {
  const [choice, setChoice] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // A fresh submission means a fresh panel.
  useEffect(() => {
    setChoice('')
    setReason('')
    setError('')
  }, [submission.id])

  if (submission.status === 'superseded') {
    return (
      <Panel as="div" className="p-4">
        <h3 className="mb-2 text-base text-deep">Status</h3>
        <p className="text-sm text-deep">
          Superseded by a newer {routeLabel(submission.path)} submission
          {supersededBy ? ` on ${formatTimestamp(supersededBy.submitted_at)}` : ''}. This submission
          is locked.
        </p>
      </Panel>
    )
  }

  // Procurement (or any login that is not an active EHS/ESG account) gets no
  // control at all — not a disabled one. set_submission_status() refuses the
  // same call independently if it is made from the console.
  if (!canReview) return null

  const reasonRequired = choice === 'needs_review'
  // Disabled until a *different* status is chosen and, for Needs review, a
  // non-blank reason is entered.
  const canSave =
    choice !== '' && choice !== submission.status && (!reasonRequired || reason.trim() !== '')

  async function handleSave() {
    if (!canSave || busy) return
    setBusy(true)
    setError('')
    try {
      await setSubmissionStatus({ submissionId: submission.id, newStatus: choice, reason })
      await onSaved()
      setChoice('')
      setReason('')
    } catch (err) {
      // DL409 is the function's "this row is superseded" refusal, which the
      // spec words differently from a general failure. It happens when the
      // supplier resubmitted while this page was open.
      if (err?.code === 'DL409') {
        setError('This submission has been superseded and is locked.')
        await onSaved()
      } else if (err?.code === 'DL403') {
        // The Admin changed this login's role since the page loaded. Refresh,
        // which re-reads the role and removes the controls.
        setError('Status not saved. Nothing was changed. Try again.')
        await onSaved()
      } else {
        setError('Status not saved. Nothing was changed. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel as="div" className="p-4">
      <h3 className="mb-3 text-base text-deep">Status</h3>

      <fieldset className="mb-3">
        <legend className="sr-only">Set review status</legend>
        <div className="flex flex-wrap gap-4">
          {['accepted', 'needs_review'].map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-deep">
              <input
                type="radio"
                name="status-choice"
                value={value}
                checked={choice === value}
                disabled={submission.status === value}
                onChange={() => setChoice(value)}
              />
              {statusLabel(value)}
              {submission.status === value ? (
                <span className="text-xs text-deep-60">(current)</span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-deep">
          Review comment{' '}
          {reasonRequired ? (
            <span className="text-clay">— required for Needs review</span>
          ) : (
            <span className="text-deep-60">— optional</span>
          )}
        </span>
        <textarea
          className={inputClass}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={!canSave || busy}>
          {busy ? 'Saving…' : 'Save status'}
        </Button>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    </Panel>
  )
}

function Timeline({ submission, history }) {
  return (
    <Panel as="div" className="p-4">
      <h3 className="mb-3 text-base text-deep">Status history</h3>
      <ol className="space-y-3">
        {history.map((entry) => (
          <li key={entry.id} className="border-l-2 border-deep-12 pl-3">
            <p className="text-xs text-deep-60">{formatTimestamp(entry.changed_at)}</p>
            <p className="text-sm text-deep">
              {statusLabel(entry.from_status)} → {statusLabel(entry.to_status)}
            </p>
            {entry.reason ? <p className="text-sm text-deep-60">{entry.reason}</p> : null}
            <p className="text-xs text-deep-60">{entry.changed_by_email || 'Automatic'}</p>
          </li>
        ))}
        {/* The first line of the timeline is always the submission itself. */}
        <li className="border-l-2 border-deep-12 pl-3">
          <p className="text-xs text-deep-60">{formatTimestamp(submission.submitted_at)}</p>
          <p className="text-sm text-deep">Received</p>
        </li>
      </ol>
    </Panel>
  )
}

function OtherSubmissions({ others, onOpen }) {
  if (others.length === 0) return null
  return (
    <Panel as="div" className="p-4">
      <h3 className="mb-3 text-base text-deep">Other submissions from this company</h3>
      <ul className="space-y-2">
        {others.map((other) => (
          <li key={other.id} className="flex flex-wrap items-center gap-3 text-sm">
            {/* doorLabel already carries the route, e.g. "Questionnaire — guided form". */}
            <TextLink onClick={() => onOpen(other.id)}>{doorLabel(other.door)}</TextLink>
            <span className="text-deep-60">{formatTimestamp(other.submitted_at)}</span>
            <StatusBadge status={other.status} label={statusLabel(other.status)} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export default function SupplierDetail({
  submission,
  company,
  others,
  onBack,
  onOpen,
  onRefresh,
  canReview,
}) {
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState('')

  async function loadHistory() {
    try {
      setHistory(await fetchStatusHistory(submission.id))
      setHistoryError('')
    } catch {
      setHistoryError('The status history could not be loaded.')
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id])

  // The newer submission on the same route that superseded this one.
  const supersededBy =
    submission.status === 'superseded'
      ? others
          .filter((o) => o.path === submission.path && o.submitted_at > submission.submitted_at)
          .sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1))[0]
      : null

  async function handleSaved() {
    await onRefresh()
    await loadHistory()
  }

  return (
    <div className="space-y-5">
      <div>
        <TextLink onClick={onBack}>← Back to register</TextLink>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl text-deep">{company.legal_name}</h2>
        <StatusBadge status={submission.status} label={statusLabel(submission.status)} />
      </div>
      <p className="-mt-3 text-sm text-deep-60">{doorLabel(submission.door)}</p>

      <Identity company={company} submission={submission} />

      <div>
        <h3 className="mb-3 text-base text-deep">Submission content</h3>
        <SubmissionContent submission={submission} />
      </div>

      <StatusPanel
        submission={submission}
        supersededBy={supersededBy}
        canReview={canReview}
        onSaved={handleSaved}
      />

      <ErrorMessage>{historyError}</ErrorMessage>
      <Timeline submission={submission} history={history} />

      <OtherSubmissions others={others} onOpen={onOpen} />
    </div>
  )
}
