import { useMemo, useState } from 'react'
import { formatTimestamp } from '../lib/format.js'
import { routeLabel, statusLabel } from '../lib/display.js'
import { EmptyRow, Panel, SectionHeading, SortableHeader, StatusBadge, Table, inputClass } from './ui.jsx'

// Section C. Current submissions only, one row each — so a company with a
// current submission on both routes appears twice.

export default function Register({ rows, onOpen }) {
  const [sort, setSort] = useState({ key: 'submitted_at', direction: 'desc' })
  const [search, setSearch] = useState('')

  function handleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'submitted_at' ? 'desc' : 'asc' },
    )
  }

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = needle
      ? rows.filter((row) => row.company.legal_name.toLowerCase().includes(needle))
      : rows

    const value = (row) => {
      switch (sort.key) {
        case 'company':
          return row.company.legal_name.toLowerCase()
        case 'contact':
          return (row.company.contact_name ?? '').toLowerCase()
        case 'route':
          return routeLabel(row.submission.path).toLowerCase()
        case 'status':
          return statusLabel(row.submission.status).toLowerCase()
        default:
          return row.submission.submitted_at
      }
    }

    return [...filtered].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      if (av === bv) return a.company.legal_name.localeCompare(b.company.legal_name)
      const cmp = av < bv ? -1 : 1
      return sort.direction === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, search])

  return (
    <section id="register" className="scroll-mt-24">
      <SectionHeading id="register-heading">Register</SectionHeading>

      <Panel as="div" className="mb-4 flex flex-wrap items-end gap-4 p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-deep">Search by company name</span>
          <input
            type="search"
            className={`${inputClass} min-w-[18rem]`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name"
          />
        </label>
        <p className="pb-2 text-sm text-deep-60">
          {visible.length} {visible.length === 1 ? 'submission' : 'submissions'} shown
        </p>
      </Panel>

      <Table>
        <thead>
          <tr>
            <SortableHeader label="Company" columnKey="company" sort={sort} onSort={handleSort} />
            <SortableHeader label="Contact name" columnKey="contact" sort={sort} onSort={handleSort} />
            <SortableHeader label="Route" columnKey="route" sort={sort} onSort={handleSort} />
            <SortableHeader label="Status" columnKey="status" sort={sort} onSort={handleSort} />
            <SortableHeader
              label="Date submitted"
              columnKey="submitted_at"
              sort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <EmptyRow colSpan={5}>
              {search.trim() ? 'No suppliers match that search.' : 'No submissions yet.'}
            </EmptyRow>
          ) : (
            visible.map((row) => (
              <tr
                key={row.submission.id}
                tabIndex={0}
                role="button"
                onClick={() => onOpen(row.submission.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(row.submission.id)
                  }
                }}
                className="cursor-pointer border-t border-deep-12 bg-mint hover:bg-silver-50"
              >
                <td className="px-3 py-2 text-deep">{row.company.legal_name}</td>
                <td className="px-3 py-2 text-deep">{row.company.contact_name}</td>
                <td className="px-3 py-2 text-deep">{routeLabel(row.submission.path)}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    status={row.submission.status}
                    label={statusLabel(row.submission.status)}
                  />
                </td>
                <td className="px-3 py-2 text-deep">{formatTimestamp(row.submission.submitted_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </section>
  )
}
