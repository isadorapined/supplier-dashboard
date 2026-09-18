import { ECOVADIS_QUESTIONS } from '../lib/ecovadis.js'
import { GUIDED_FIELDS, SECTIONS } from '../lib/questions.js'
import { formatBytes, formatDateValue, formatTimestamp } from '../lib/format.js'
import { answerText, notesFor } from '../lib/display.js'
import { FLAGS, RAISED, flagState } from '../lib/flags.js'
import { Panel } from './ui.jsx'

// View 3, part 3. What appears depends on route and door.
// Question text always comes from GUIDED_FIELDS[].label — the corrected guided
// wording — never the workbook's templateText.

const FLAG_BY_ID = new Map(FLAGS.map((flag) => [flag.id, flag]))

function NotAnswered() {
  return <span className="text-deep-60">Not answered</span>
}

function Attachment({ submission }) {
  if (!submission.attached_file_name) return null
  return (
    <p className="text-sm text-deep">
      <span className="text-deep-60">Attached file: </span>
      {submission.attached_file_name}
      {Number.isFinite(submission.attached_file_size)
        ? ` (${formatBytes(submission.attached_file_size)})`
        : ''}
      {/* The portal never stored the file itself — only its name and size. */}
      <span className="mt-1 block text-xs text-deep-60">
        The file itself was not stored and cannot be downloaded.
      </span>
    </p>
  )
}

function AnswerRow({ label, esrs, value, notes, flag, answers }) {
  const raised = flag ? flagState(flag, answers) === RAISED : false
  return (
    <div className="border-t border-deep-12 px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-2">
        {esrs ? <span className="text-xs text-deep-60">{esrs}</span> : null}
        <p className="text-sm font-medium text-deep">{label}</p>
        {raised ? (
          <span className="rounded border border-clay px-1.5 py-0.5 text-xs font-medium text-clay">
            {flag.label} — raised
          </span>
        ) : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-deep">{value || <NotAnswered />}</p>
      {notes ? (
        <p className="mt-1 whitespace-pre-wrap text-xs text-deep-60">
          <span className="font-medium">Notes / evidence: </span>
          {notes}
        </p>
      ) : null}
    </div>
  )
}

// EcoVadis Q1 and Q2 are dates, Q3–Q7 scores. Labels come from ecovadis.js.
function ecovadisValue(question, answers) {
  const raw = answerText(answers, question.id)
  if (!raw) return ''
  return question.type === 'date' ? formatDateValue(raw) || raw : raw
}

function EcoVadisContent({ submission }) {
  const answers = submission.answers || {}
  // The upload door carries Q1, Q2 and Q3 only; the form door carries all nine.
  const questions =
    submission.door === 'ecovadis_upload'
      ? ECOVADIS_QUESTIONS.filter((q) => ['Q1', 'Q2', 'Q3'].includes(q.id))
      : ECOVADIS_QUESTIONS

  return (
    <Panel as="div" className="overflow-hidden">
      {submission.door === 'ecovadis_upload' ? (
        <div className="border-b border-deep-12 px-4 py-3">
          <Attachment submission={submission} />
        </div>
      ) : null}
      {questions.map((question) => (
        <AnswerRow
          key={question.id}
          label={question.label}
          value={ecovadisValue(question, answers)}
        />
      ))}
    </Panel>
  )
}

function QuestionnaireContent({ submission }) {
  const answers = submission.answers || {}

  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => {
        const fields = GUIDED_FIELDS.filter((f) => f.section === section.id)
        return (
          <div key={section.id}>
            <h4 className="mb-2 flex items-baseline gap-2 text-base text-deep">
              <span aria-hidden="true" className="inline-block h-4 w-1 rounded-sm bg-teal" />
              {section.id} {section.title}
              <span className="text-xs text-deep-60">{section.esrs}</span>
            </h4>
            <Panel as="div" className="overflow-hidden">
              {fields.map((field) => (
                <AnswerRow
                  key={field.id}
                  label={field.label}
                  esrs={field.esrs}
                  value={answerText(answers, field.id)}
                  notes={notesFor(answers, field.id)}
                  flag={FLAG_BY_ID.get(field.id)}
                  answers={answers}
                />
              ))}
            </Panel>
          </div>
        )
      })}

      <Panel as="div" className="space-y-1 p-4 text-sm text-deep">
        <p>
          <span className="text-deep-60">Signatory: </span>
          {submission.signatory_name || <NotAnswered />}
        </p>
        <p>
          <span className="text-deep-60">Declaration date: </span>
          {submission.declaration_date ? (
            formatDateValue(submission.declaration_date)
          ) : (
            <NotAnswered />
          )}
        </p>
        {submission.door === 'assessment_upload' ? <Attachment submission={submission} /> : null}
      </Panel>
    </div>
  )
}

export default function SubmissionContent({ submission }) {
  return submission.path === 'ecovadis' ? (
    <EcoVadisContent submission={submission} />
  ) : (
    <QuestionnaireContent submission={submission} />
  )
}

export { formatTimestamp }
