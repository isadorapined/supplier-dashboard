// Display vocabulary: the plain-language labels the dashboard shows for the
// portal's stored route, door and status codes. Wording is the spec's.

export const ROUTE_LABELS = {
  ecovadis: 'EcoVadis',
  full: 'Questionnaire',
}

export const DOOR_LABELS = {
  ecovadis_upload: 'EcoVadis — scorecard upload',
  ecovadis_form: 'EcoVadis — form',
  assessment_guided: 'Questionnaire — guided form',
  assessment_upload: 'Questionnaire — workbook upload',
}

export const STATUS_LABELS = {
  new: 'New',
  accepted: 'Accepted',
  needs_review: 'Needs review',
  superseded: 'Superseded',
}

export const routeLabel = (path) => ROUTE_LABELS[path] ?? path
export const doorLabel = (door) => DOOR_LABELS[door] ?? door
export const statusLabel = (status) => STATUS_LABELS[status] ?? status

// A submission is current when its status is not 'superseded'. The superseding
// trigger guarantees at most one current submission per company per route.
export const isCurrent = (submission) => submission?.status !== 'superseded'

// Notes live alongside answers under `<id>__notes`, spec Section 5.
export const notesFor = (answers, id) => {
  const note = answers?.[`${id}__notes`]
  return typeof note === 'string' && note.trim() ? note.trim() : ''
}

export const answerText = (answers, id) => {
  const value = answers?.[id]
  if (value == null) return ''
  return String(value).trim()
}
