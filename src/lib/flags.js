// Risk flags — product spec 9.3, the "Cautious" rule.
//
// A flag is Not raised only when the answer matches one of `notRaisedWhen`.
// A blank, whitespace-only or missing answer is unanswered. Every other
// non-blank value raises the flag, including free text a supplier typed into
// the workbook. It is a plain count: no weighting, no score, no grading.
//
// The seven ids were verified against src/lib/questions.js (GUIDED_FIELDS) on
// 18 September 2026 and all match. Plain 'Yes' appears in flags 2 and 6
// because the workbook door offers only Yes/No, and a workbook 'Yes' to those
// questions is the clear positive.

export const FLAGS = [
  { id: 'S3-2', label: 'PFAS in use', notRaisedWhen: ['No'] },
  { id: 'S2-5', label: 'No SBTi target', notRaisedWhen: ['Yes — validated', 'Yes'] },
  { id: 'S4-3', label: 'High water stress', notRaisedWhen: ['No'] },
  { id: 'S6-1', label: 'Near protected area', notRaisedWhen: ['No'] },
  { id: 'S7-1', label: 'No human rights policy', notRaisedWhen: ['Yes'] },
  { id: 'S7-2', label: 'No supply-chain HR due diligence', notRaisedWhen: ['Yes — both tiers', 'Yes'] },
  {
    id: 'S7-4',
    label: 'No conflict minerals policy',
    notRaisedWhen: ['Yes', 'Not applicable to our products'],
  },
]

export const FLAG_IDS = FLAGS.map((f) => f.id)

export const RAISED = 'raised'
export const NOT_RAISED = 'not_raised'
export const UNANSWERED = 'unanswered'

const normalise = (value) => String(value ?? '').trim().toLowerCase()

// Answers are compared trimmed and case-insensitively, so 'yes' and 'Yes '
// both match 'Yes'.
export function flagState(flag, answers) {
  const raw = answers ? answers[flag.id] : undefined
  const value = normalise(raw)
  if (value === '') return UNANSWERED
  return flag.notRaisedWhen.some((ok) => normalise(ok) === value) ? NOT_RAISED : RAISED
}

// Returns null when the company has no current Questionnaire submission —
// the caller renders "Not assessable via questionnaire", never a 0.
export function assessFlags(submission) {
  if (!submission) return null
  const answers = submission.answers || {}
  const states = FLAGS.map((flag) => ({ flag, state: flagState(flag, answers) }))
  return {
    states,
    flagCount: states.filter((s) => s.state === RAISED).length,
    unansweredCount: states.filter((s) => s.state === UNANSWERED).length,
    submittedAt: submission.submitted_at,
    submissionId: submission.id,
  }
}
