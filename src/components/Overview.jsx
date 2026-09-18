import { Panel, SectionHeading } from './ui.jsx'

// Section A. Every figure counts current submissions only (status not
// 'superseded'). Total always equals EcoVadis + Questionnaire by construction:
// `path` is check-constrained to those two values.

function Figure({ label, value }) {
  return (
    <Panel as="div" className="px-5 py-4">
      <p className="text-sm text-deep-60">{label}</p>
      <p className="dl-figure mt-1 text-3xl text-deep">{value}</p>
    </Panel>
  )
}

// Two-slice pie drawn as SVG arcs. EcoVadis in Deep Space Blue, Questionnaire
// in Deep Teal, per the spec's colour roles.
function Pie({ ecovadis, questionnaire }) {
  const total = ecovadis + questionnaire
  const slices = [
    { label: 'EcoVadis', count: ecovadis, fill: 'var(--dl-deep-space)' },
    { label: 'Questionnaire', count: questionnaire, fill: 'var(--dl-deep-teal)' },
  ]

  const radius = 70
  const centre = 80
  let angle = -Math.PI / 2

  const paths = slices
    .filter((slice) => slice.count > 0)
    .map((slice) => {
      const sweep = (slice.count / total) * Math.PI * 2
      // A single slice covering the whole circle cannot be drawn as an arc:
      // start and end points coincide. Draw it as a plain circle instead.
      if (slice.count === total) {
        return { ...slice, circle: true }
      }
      const x1 = centre + radius * Math.cos(angle)
      const y1 = centre + radius * Math.sin(angle)
      angle += sweep
      const x2 = centre + radius * Math.cos(angle)
      const y2 = centre + radius * Math.sin(angle)
      const largeArc = sweep > Math.PI ? 1 : 0
      return {
        ...slice,
        d: `M ${centre} ${centre} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      }
    })

  const percent = (count) => `${Math.round((count / total) * 100)}%`

  return (
    <div className="flex flex-wrap items-center gap-8">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        role="img"
        aria-label={`Submissions by route: EcoVadis ${ecovadis}, Questionnaire ${questionnaire}`}
      >
        {paths.map((slice) =>
          slice.circle ? (
            <circle key={slice.label} cx={centre} cy={centre} r={radius} fill={slice.fill} />
          ) : (
            <path key={slice.label} d={slice.d} fill={slice.fill} />
          ),
        )}
      </svg>

      <ul className="space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-deep">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: slice.fill }}
            />
            <span>
              {slice.label} — <span className="dl-figure">{slice.count}</span> ({percent(slice.count)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Overview({ currentSubmissions }) {
  const ecovadis = currentSubmissions.filter((s) => s.path === 'ecovadis').length
  const questionnaire = currentSubmissions.filter((s) => s.path === 'full').length
  const total = currentSubmissions.length

  return (
    <section id="overview" className="scroll-mt-24">
      <SectionHeading id="overview-heading">Overview</SectionHeading>

      <div className="grid gap-4 sm:grid-cols-3">
        <Figure label="Total submissions" value={total} />
        <Figure label="EcoVadis submissions" value={ecovadis} />
        <Figure label="Questionnaire submissions" value={questionnaire} />
      </div>

      <Panel as="div" className="mt-4 p-5">
        <h3 className="mb-4 text-base text-deep">Submissions by route</h3>
        {total === 0 ? (
          <p className="text-sm text-deep-60">No submissions yet.</p>
        ) : (
          <Pie ecovadis={ecovadis} questionnaire={questionnaire} />
        )}
      </Panel>
    </section>
  )
}
