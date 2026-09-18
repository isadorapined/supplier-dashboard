const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// "4 September 2026, 14:32" — the visitor's local time, no leading zero on the day.
export function formatTimestamp(date) {
  const d = date instanceof Date ? date : new Date(date)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

// An <input type="date"> value (YYYY-MM-DD) rendered in the same style.
export function formatDateValue(value) {
  if (!isFilled(value)) return ''
  const [y, m, d] = String(value).split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return String(value)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function todayValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function isFilled(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value != null && value !== ''
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim())
}

// Pulls the first email-shaped token out of a free-text cell. The template's
// S1 contact row combines name, title, and email into one cell, so the upload
// review has to find the address inside whatever the supplier typed.
export function findEmail(value) {
  const match = String(value ?? '').match(/[^\s,;<>()]+@[^\s,;<>()]+\.[A-Za-z]{2,}/)
  return match ? match[0] : ''
}

export function isValidDate(value) {
  if (!isFilled(value)) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim())
  if (!match) return false
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

// A score is valid when it is blank or a number from 0 to 100.
export function isValidScore(value) {
  if (!isFilled(value)) return true
  const n = Number(String(value).trim())
  return Number.isFinite(n) && n >= 0 && n <= 100
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
