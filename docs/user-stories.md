# User Stories — The Corporate Supplier Review Dashboard 2026

**Written against:** product-spec.md v2.0 · supabase-setup.md as of 18 September 2026 (pre-`user_roles`)
**Date:** 25 September 2026
**Author:** Isa
**Status:** Confirmed
**Population pattern:** P1 — public, stays anonymous (suppliers submit through the portal and never log in; the dashboard's team logs in)
**Companion file:** access-matrix.md (every story below cites exactly one cell of it: `[table · action · role]`; a story that needs two cells is two stories)

> Read by the Project Governor (Iteration Mode) and by Claude Code when it builds `user_roles`, the Admin capability, and the tightened `set_submission_status()` together. Each acceptance line is a screen test: the named person does the thing and sees the result. Stories whose cell is `no` are refusal tests and are as important as the others.

---

## The people

| Role | Named first holder | Layer | Opens |
|---|---|---|---|
| Reviewer *(schema stores `ehs` / `esg` as separate labels for the roster; permissions are identical)* | Isabela — isabela@gmail.com (EHS) · Isa — isadorapined@gmail.com (ESG) | business | Dashboard: Overview, Risk Flag Board, Register, Detail |
| Procurement | isabel — isabel@gmail.com | business | Dashboard: same screens, view-only |
| Admin *(capability, layered on exactly one active Reviewer account)* | Isa — isadorapined@gmail.com (today, on her ESG account) | app admin | Admin Panel (View 4), plus everything her Reviewer role opens |
| platform owner | Isa, personally | outside the app | Supabase and Netlify dashboards |

This is a stack: the portal (Tool A) has the `anon` column below and no other role. This dashboard (Tool B) has Reviewer, Procurement, and the Admin capability. One matrix, because one database.

---

## The anon / portal stories (unchanged, already built — carried forward for completeness)

- **As a visitor (a supplier), I submit one submission through the portal, so that my company's answers are saved.** `submissions · create · anon`
  Acceptance: the portal's insert (`status = 'new'`) succeeds through the existing RLS `INSERT` policy — built in Tool A, not part of this dashboard's scope.
- **As a visitor, I cannot read any submission or company, so that nothing leaks.** `submissions · read · anon` (= no) · `companies · read · anon` (= no)
  Acceptance: a direct read from the browser returns a permission error, not an empty list.
- **As a visitor, I cannot edit a submission; submitting again on the same route supersedes the old one automatically, never by my own request.** `submissions · update · anon` (= no)
  Acceptance: no edit screen exists; the AFTER INSERT trigger flips the prior row on the same `(company_id, path)` to `superseded`, with an automatic log entry.

---

## Stories by role and screen

### Reviewer (Isabela — EHS, Isa — ESG) — Dashboard

- **As a Reviewer, I see every submission with its risk flags and status, so that I can act on risk quickly.** `submissions · read · Reviewer`
  Acceptance: Isabela opens the Register and sees every current submission, including ones from companies she has never reviewed before.
- **As a Reviewer, I open a submission's detail page and set its status to Accepted or Needs review, writing a comment when required, so that the review outcome is recorded.** `submissions · change state → accepted/needs_review · Reviewer`
  Acceptance: Isa opens a submission, selects Needs review, enters a reason, saves; the status badge updates and a log row appears with her email and the reason.
- **As a Reviewer, I cannot change a superseded submission's status, so that a stale review is never recorded.** `submissions · change state · Reviewer` (= no on superseded rows)
  Acceptance: Isabela opens a superseded submission; the status controls refuse the change with "This submission has been superseded and is locked."
- **As a Reviewer, I read only my own `user_roles` row, so that my role shows correctly in the top bar and I cannot see teammates' rows.** `user_roles · read · Reviewer` (= own)
  Acceptance: Isa's top bar shows "isadorapined@gmail.com · ESG"; a direct query for Isabela's row, run as Isa, returns nothing.

### Procurement (isabel) — Dashboard

- **As Procurement, I see every submission with its risk flags, status and review comment, so that I can decide which suppliers to engage commercially.** `submissions · read · Procurement` · `submission_status_changes · read · Procurement`
  Acceptance: isabel opens the Register and any detail page and sees the same information Isabela and Isa see, including existing comment text.
- **As Procurement, I cannot set a status or write a comment, so that only EHS/ESG review outcomes are ever recorded.** `submissions · change state · Procurement` (= no)
  Acceptance: isabel's detail page renders no Save-status button and no editable comment field; calling `set_submission_status()` directly from her authenticated session is refused regardless of parameters.

### Admin (Isa) — Admin Panel

- **As Admin, I invite a new team member with a role, so that access follows the team.** `user_roles · create · Admin` (via the Netlify Function)
  Acceptance: Isa enters isabel's email and role Procurement in the Admin Panel; a starter password shows once and isabel can log in with it.
- **As Admin, I deactivate a team member's access, so that a leaver is refused at once.** `user_roles · update (is_active) · Admin`
  Acceptance: Isa deactivates a test account; its next login attempt fails, and any already-open session's next request also fails — not just a role check.
- **As Admin, I reset a team member's password, so that they regain access without touching the Supabase dashboard.** `user_roles · update · Admin`
  Acceptance: Isa resets Isabela's password; the old one stops working and the new one, shown once, works.
- **As Admin, I reassign a team member's role, so that responsibilities can shift without recreating an account.** `user_roles · update (role) · Admin`
  Acceptance: Isa changes isabel's role from Procurement to EHS; without logging out, isabel's next status-change attempt succeeds.
- **As Admin, I move the Admin capability to another active Reviewer account, so that the team is never left without one.** `user_roles · update (is_admin) · Admin`
  Acceptance: Isa moves Admin to Isabela; Isa's Admin Panel entry point disappears and Isabela's appears, in the same action.
- **As Admin, I cannot deactivate my own account or drop my own Admin status without naming a successor in the same action, so that the team can never be left with zero admins.** `user_roles · update · Admin` (= no, self-lockout)
  Acceptance: Isa's own row shows no deactivate toggle and no bare "remove Admin" control; a direct call to the Function attempting either is refused.
- **As Admin, I read the full team roster, so that I can support the team.** `user_roles · read · Admin` (via the Function only, service role key, bypasses RLS after checking `is_admin`)
  Acceptance: Isa opens the Admin Panel and sees every member's email, role, Admin flag and active status; a non-admin's direct query against `user_roles` never returns more than their own row.

### Reviewer, Procurement — Admin Panel (refusal)

- **As a non-admin, I cannot open the Admin Panel, so that account management stays with the one Admin.** *(screen refusal — no table cell; the route itself is guarded, and the data behind it never reaches anyone but the Admin)*
  Acceptance: isabel and Isabela see no link to the Admin Panel; a direct visit to its URL redirects to the Dashboard.

---

## Stories that are refusals (collected)

| # | Who | Tries | Result | Cell |
|---|---|---|---|---|
| 1 | isabel (Procurement) | call `set_submission_status()` directly | refused regardless of parameters | `submissions · change state · Procurement` |
| 2 | isabel or Isabela | visit the Admin Panel URL directly | redirected to the Dashboard | screen refusal |
| 3 | any authenticated user | query `user_roles` for another person's row | returns nothing | `user_roles · read · role` |
| 4 | any authenticated user | insert, update or delete a `user_roles` row directly | refused — no policy exists | `user_roles · create/update/delete · role` |
| 5 | anon (logged out) | read `companies`, `submissions`, `submission_status_changes`, or any row of `user_roles` | nothing returned | `* · read · anon` |
| 6 | Isa (current Admin) | deactivate her own account, or drop her own Admin status without naming a successor | refused, both in the UI and via a direct Function call | `user_roles · update · Admin` |
| 7 | anyone | delete a submission, a company, or a status-change row | no delete anywhere | `* · delete · *` |
| 8 | anyone | edit a superseded submission | refused: "This submission has been superseded and is locked." | `submissions · update/change state · *` |

---

## Later list (not this version)

- A fourth, dedicated Admin role separate from EHS/ESG.
- More than one simultaneous Admin.
- An audit log of admin actions themselves (who invited/deactivated/reassigned whom, and when) — `user_roles`' current state is the only record kept.
- In-app self-service "forgot password."
