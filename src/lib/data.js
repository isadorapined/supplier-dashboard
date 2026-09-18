import { supabase } from './supabase.js'

// Every read here runs as the logged-in user through RLS: `authenticated` may
// select all rows of companies, submissions and submission_status_changes, and
// may write nothing directly. Nothing in this module runs before login — the
// app renders the Login view until a session exists.

export async function fetchDashboard() {
  const [companiesRes, submissionsRes] = await Promise.all([
    supabase
      .from('companies')
      .select('id, legal_name, registered_country, contact_name, contact_title, contact_email'),
    supabase
      .from('submissions')
      .select(
        'id, company_id, path, door, answers, attached_file_name, attached_file_size, signatory_name, declaration_date, submitted_at, status',
      )
      .order('submitted_at', { ascending: false }),
  ])

  if (companiesRes.error) throw companiesRes.error
  if (submissionsRes.error) throw submissionsRes.error

  return {
    companies: companiesRes.data ?? [],
    submissions: submissionsRes.data ?? [],
  }
}

export async function fetchStatusHistory(submissionId) {
  const { data, error } = await supabase
    .from('submission_status_changes')
    .select('id, submission_id, from_status, to_status, reason, changed_by, changed_by_email, changed_at')
    .eq('submission_id', submissionId)
    .order('changed_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// The only way a status changes by hand. There is no update policy on
// submissions, so a direct update would be refused even if one were attempted.
export async function setSubmissionStatus({ submissionId, newStatus, reason }) {
  const { error } = await supabase.rpc('set_submission_status', {
    p_submission_id: submissionId,
    p_new_status: newStatus,
    p_reason: reason?.trim() ? reason.trim() : null,
  })
  if (error) throw error
}
