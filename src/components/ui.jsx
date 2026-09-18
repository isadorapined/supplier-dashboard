// Shared primitives, shadcn/ui-shaped (composable wrappers over Tailwind
// classes) but hand-written against the Data Leaf tokens, so no component
// carries a default white, gray or blue.

export function Panel({ children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`rounded-md border border-deep-12 bg-silver ${className}`}>{children}</Tag>
  )
}

export function SectionHeading({ id, children, note }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      {/* Section marker — Deep Teal, per the spec's colour roles. */}
      <span aria-hidden="true" className="mt-1 h-5 w-1 shrink-0 rounded-sm bg-teal" />
      <h2 id={id} className="text-xl text-deep">
        {children}
      </h2>
      {note ? <span className="text-sm text-deep-60">{note}</span> : null}
    </div>
  )
}

const BADGE_STYLES = {
  new: 'bg-silver text-deep border-deep-12',
  accepted: 'bg-teal text-mint border-teal',
  needs_review: 'bg-clay text-mint border-clay',
  superseded: 'bg-silver-50 text-deep border-deep-12',
}

export function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${
        BADGE_STYLES[status] ?? BADGE_STYLES.new
      }`}
    >
      {label}
    </span>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles =
    variant === 'primary'
      ? 'bg-teal text-mint border-teal hover:opacity-90 disabled:opacity-40'
      : 'bg-mint text-deep border-deep-30 hover:bg-silver disabled:opacity-40'
  return (
    <button
      className={`inline-flex items-center justify-center rounded border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  )
}

export function TextLink({ className = '', ...props }) {
  return (
    <button
      type="button"
      className={`text-clay underline underline-offset-2 hover:opacity-80 ${className}`}
      {...props}
    />
  )
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-sm font-medium text-deep">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-deep-60">{hint}</span> : null}
    </label>
  )
}

export const inputClass =
  'w-full rounded border border-deep-30 bg-mint px-3 py-2 text-sm text-deep placeholder:text-deep-60 focus:border-teal focus:outline-none'

export function ErrorMessage({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-clay">
      {children}
    </p>
  )
}

// Table shell. Headers sit on Silver; rows on Mint Cream with a hairline rule.
export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-md border border-deep-12">
      <table className={`w-full border-collapse text-left text-sm ${className}`}>{children}</table>
    </div>
  )
}

export function SortableHeader({ label, columnKey, sort, onSort, align = 'left', title }) {
  const active = sort.key === columnKey
  const arrow = active ? (sort.direction === 'asc' ? '↑' : '↓') : ''
  return (
    <th
      scope="col"
      title={title}
      className={`bg-silver px-3 py-2 font-medium text-deep ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <span aria-hidden="true" className="text-xs text-deep-60">
          {arrow}
        </span>
      </button>
    </th>
  )
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-mint px-3 py-6 text-center text-sm text-deep-60">
        {children}
      </td>
    </tr>
  )
}
