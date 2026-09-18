import { useMemo, useState } from 'react'
import { FLAGS, RAISED, NOT_RAISED, UNANSWERED } from '../lib/flags.js'
import { formatTimestamp } from '../lib/format.js'
import { EmptyRow, Panel, SectionHeading, SortableHeader, Table, inputClass } from './ui.jsx'

// Section B. One row per company that has any current submission. The flag
// figures come from that company's current Questionnaire submission; a company
// without one is "Not assessable via questionnaire", never 0.

const INDICATOR = {
  [RAISED]: { mark: '●', className: 'text-clay', word: 'raised' },
  [NOT_RAISED]: { mark: '○', className: 'text-deep-30', word: 'not raised' },
  [UNANSWERED]: { mark: '–', className: 'text-deep-60', word: 'unanswered' },
}

function Indicator({ state, flagLabel, company }) {
  const { mark, className, word } = INDICATOR[state]
  return (
    <span
      className={`block text-center text-base leading-none ${className}`}
      title={`${flagLabel} — ${word}`}
    >
      <span aria-hidden="true">{mark}</span>
      <span className="sr-only">{`${company}: ${flagLabel} ${word}`}</span>
    </span>
  )
}

export default function FlagBoard({ rows }) {
  const [sort, setSort] = useState({ key: 'flagCount', direction: 'desc' })
  const [filter, setFilter] = useState('all')

  function handleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'company' ? 'asc' : 'desc' },
    )
  }

  const visible = useMemo(() => {
    // A single-flag filter shows only companies with that flag raised, which
    // excludes not-assessable rows by definition.
    const filtered =
      filter === 'all'
        ? rows
        : rows.filter((row) =>
            row.assessment?.states.some((s) => s.flag.id === filter && s.state === RAISED),
          )

    const byName = (a, b) => a.company.legal_name.localeCompare(b.company.legal_name)

    return [...filtered].sort((a, b) => {
      // Not-assessable rows always sort after every assessable row, in either
      // direction — they are not a zero, so they never lead the board.
      const aMissing = !a.assessment
      const bMissing = !b.assessment
      if (aMissing !== bMissing) return aMissing ? 1 : -1
      if (aMissing && bMissing) return byName(a, b)

      if (sort.key === 'company') {
        const cmp = byName(a, b)
        return sort.direction === 'asc' ? cmp : -cmp
      }

      const field = sort.key === 'unansweredCount' ? 'unansweredCount' : 'flagCount'
      const cmp = a.assessment[field] - b.assessment[field]
      // Ties sort by company name A–Z, whichever way the column is sorted.
      return (sort.direction === 'asc' ? cmp : -cmp) || byName(a, b)
    })
  }, [rows, sort, filter])

  return (
    <section id="risk-flags" className="scroll-mt-24">
      <SectionHeading id="risk-flags-heading">Risk Flags</SectionHeading>

      <Panel as="div" className="mb-4 flex flex-wrap items-end gap-4 p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-deep">Filter by flag</span>
          <select
            className={`${inputClass} min-w-[18rem]`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All suppliers</option>
            {FLAGS.map((flag) => (
              <option key={flag.id} value={flag.id}>
                {flag.label}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-sm text-deep-60">
          {visible.length} {visible.length === 1 ? 'company' : 'companies'} shown
        </p>
      </Panel>

      <Table>
        <thead>
          <tr>
            <SortableHeader label="Company" columnKey="company" sort={sort} onSort={handleSort} />
            <SortableHeader
              label="Flags"
              columnKey="flagCount"
              sort={sort}
              onSort={handleSort}
              align="right"
            />
            <SortableHeader
              label="Unanswered"
              columnKey="unansweredCount"
              sort={sort}
              onSort={handleSort}
              align="right"
            />
            {FLAGS.map((flag, index) => (
              <th
                key={flag.id}
                scope="col"
                title={flag.label}
                className="bg-silver px-2 py-2 text-center font-medium text-deep"
              >
                <span aria-hidden="true">{index + 1}</span>
                <span className="sr-only">{flag.label}</span>
              </th>
            ))}
            <th scope="col" className="bg-silver px-3 py-2 font-medium text-deep">
              Questionnaire date
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <EmptyRow colSpan={4 + FLAGS.length}>No companies match that filter.</EmptyRow>
          ) : (
            visible.map((row) => (
              <tr key={row.company.id} className="border-t border-deep-12 bg-mint align-middle">
                <td className="px-3 py-2 text-deep">{row.company.legal_name}</td>
                {row.assessment ? (
                  <>
                    <td className="dl-figure px-3 py-2 text-right text-deep">
                      {row.assessment.flagCount}
                    </td>
                    <td className="dl-figure px-3 py-2 text-right text-deep">
                      {row.assessment.unansweredCount}
                    </td>
                    {row.assessment.states.map(({ flag, state }) => (
                      <td key={flag.id} className="px-2 py-2">
                        <Indicator
                          state={state}
                          flagLabel={flag.label}
                          company={row.company.legal_name}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-deep-60">
                      {formatTimestamp(row.assessment.submittedAt)}
                    </td>
                  </>
                ) : (
                  <td colSpan={2 + FLAGS.length + 1} className="px-3 py-2 text-deep-60">
                    Not assessable via questionnaire
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-deep-60">
        {FLAGS.map((flag, index) => (
          <li key={flag.id}>
            <span className="dl-figure">{index + 1}</span> — {flag.label}
          </li>
        ))}
      </ol>
    </section>
  )
}
