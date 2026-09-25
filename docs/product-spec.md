# Product Spec — The Corporate Supplier Review Dashboard 2026

**Version:** 2.0
**Date:** 25 September 2026
**Author:** Isadora Pineda Stanischeski
**Status:** Confirmed

> This is the second tool in a stack. The first tool, The Corporate Supplier Sustainability Portal 2026 (spec v3.0), is built, live, and owns the schema. This dashboard joins the same Supabase project. **Nothing in the supplier portal's code, pages, fields, routes, submission flow, workbook or capture screens changes.** The only effects on the portal are the database additions listed in Section 5, which the portal never reads.

---

## Section 1 — Tool Summary

**Tool name:** The Corporate Supplier Review Dashboard 2026

**What it does:** An internal, login-protected dashboard that shows every supplier submission the portal has saved. It has three sections: an overview with headline numbers, a risk flag board built from seven Yes/No questionnaire answers, and a searchable supplier register with a full detail page per submission. **EHS and ESG** can set a review status and write the review comment on each submission; **Procurement** can see all of the same information but cannot change anything. Every status change is recorded. One EHS or ESG account also holds an **Admin** capability, managed from an in-app Admin Panel, to invite team members, deactivate their access, reset their password, and assign or change anyone's role.

**Who uses it:** A small, named group at The Corporate. Everyone logs in with email and password. What they can do depends on their role — EHS and ESG review; Procurement only views. Accounts are created by the admin from inside the tool, and nobody can sign themselves up.

**Why it exists:** Today the ESG lead has to open the Supabase table editor and read raw JSON to see anything a supplier submitted. This dashboard replaces that with readable screens, surfaces risk at a glance, and gives the team a recorded review status per submission. v1.1 gave everyone the same rights and left admin work to the Supabase dashboard. v2.0 splits reviewing from viewing, and moves user management into the tool itself.

**Build status:** Iteration. Previous version (v1.1) was A2 — every logged-in person had identical permissions, and the builder managed users directly in the Supabase dashboard. This version moves to A3: EHS and ESG can review and comment, Procurement can only view, and one EHS/ESG account holds an in-app Admin capability (invite, deactivate, reset password, reassign roles). This is exactly the "User levels / roles" item v1.1 listed under Out of Scope as "planned for a later version" — that version is this one.

---

## Section 2 — Classification

### Data Model

**Decision:** D3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| D1 — Hardcoded | All data is written into the code by the developer. Users cannot input anything that persists. The tool displays what the developer put in. | No |
| D2 — Session | Data enters the tool during use and disappears when the tab closes. No database. Covers both uploaded files and form inputs. | No |
| D3 — Persisted | Data is written to a database and survives after the session ends. Supabase is required. | Yes |

**Reason:** Unchanged from v1.1, plus one new reason: who holds which role, and who is active, must itself persist and be visible to the admin across sessions.

**D3 is triggered if any of the following are true — check all that apply:**
- [x] Data must be retrievable after the session ends
- [x] Multiple sessions contribute to the same dataset
- [x] An audit trail or history is needed
- [x] Data submitted by one person must be visible to another
- [ ] Results must be accessible via a URL after the session ends
- [ ] Files uploaded by users must be stored and retrievable later

---

### Access Model

**Decision:** A3 *(changed from A2)*

| Label | What it means | This tool? |
|-------|--------------|-----------|
| A1 — Public | Anyone with the URL can use it. No login, no account required. | No |
| A2 — Authentication | Users must log in. All logged-in users see the same thing and have the same permissions. Admin work happens in the Supabase dashboard, not in the app. | No |
| A3 — Authorization | Users must log in and have different roles. Different roles see different data or have different permissions. | Yes |

**Reason:** Three roles now exist (EHS, ESG, Procurement) with different write permissions, and one account additionally holds an in-app Admin capability that manages other accounts — the moment an admin action lives inside the app rather than the Supabase dashboard, the tool is A3 by definition, regardless of how the review permissions had turned out.

> **Promotion rule:** Auth requires a database. If the access model is A2 or A3, the data model is D3 — even when all displayed content is fixed. D1/D2 combined with A2/A3 are not valid classifications; they resolve to D3.

---

### If Access Model is A2 — complete both questions

N/A — this tool is A3.

---

### If Access Model is A3 — define all roles

| Role name | Who this is | Named first holder (name, work email) | What they can see | What they can do |
|-----------|------------|----------------------------------------|-------------------|-----------------|
| EHS Manager | Reviews supplier submissions for EHS-relevant risk | Isabela — isabela@gmail.com | Overview, Risk Flag Board, Register, every submission's full detail, the review status and comment history | Set review status (Accepted / Needs review), write the review comment; everything else is read-only |
| ESG | Reviews supplier submissions for ESG-relevant risk; leads the programme | Isa — isadorapined@gmail.com | Same as EHS Manager | Same as EHS Manager |
| Procurement | Uses the review outcome to decide which suppliers to engage commercially | isabel — isabel@gmail.com | Same as EHS Manager and ESG — Overview, Risk Flag Board, Register, every submission's full detail, the review status and comment history | Nothing. No status control, no comment field, no admin panel. View-only in the UI **and** refused at the database function if attempted directly. |
| Admin *(a capability, not a fourth role)* | Layered on top of exactly one EHS or ESG account at a time. Today: Isa (ESG). | Same person as their base role | The Admin Panel: the full list of team members, their role and active/inactive status | Invite a new team member (create login, assign role); deactivate a team member's access; reset a team member's password; reassign anyone's role or move the Admin capability to someone else |

> The named first holder is what the Access Architect reads; a group is not an answer.

**Admin capability — exactly one holder, always:**
- Exactly one account holds Admin at any time. Granting it to someone else automatically revokes it from whoever had it.
- Admin cannot be switched off for the only current admin without switching it on for someone else in the same action — the team can never be left with zero admins.
- Admin is additive: it never replaces the holder's EHS or ESG review rights.

---

### Tier

**Tier:** 3 *(unchanged)*

| Tier | D+A combination | Stack | Deployment |
|------|----------------|-------|------------|
| 1 | D1+A1 or D2+A1 | Netlify only | Netlify |
| 2 | D3+A1 | Netlify + Supabase (no auth) | Netlify |
| 3 | D3+A2 or D3+A3 | Netlify + Supabase (auth + RLS) | Netlify |

> D3+A2 and D3+A3 are both Tier 3. This iteration moves within the same tier — no new infrastructure category, but it does add the tool's first server-side function (Section 3).

---

### Standalone or Stack

**This tool is:** Part of a stack — see Section 4. *(unchanged)*

---

## Section 3 — Arms

Arms are capabilities added to the tool. They do not change the tier.

> **Document search and AI knowledge bases are outside this framework version.** Not requested for this tool.

---

### AI API Arm

**Active:** No *(unchanged)*

---

### Export Arm

**Active:** No. On-screen viewing only. No CSV or PDF download of any kind. *(unchanged)*

---

### Email Arm

**Active:** No. The dashboard sends no email — not for supplier communication, and not for the new invite/reset flows either. Invite and password handover stay a manual, offline step (Slack or in person), exactly as they were when the builder did it from the Supabase dashboard; only *where* the admin triggers it changes. *(scope confirmed unchanged from v1.1 during the v2.0 interview)*

---

### Scheduled Automation Arm

**Active:** No. The automatic superseding rule (Section 9.2) is a database trigger, not a scheduled job. *(unchanged)*

---

### New in v2.0 — Admin / User-Management capability *(not one of the four standard arms)*

This isn't AI, export, email, or scheduled automation, but it is genuinely new infrastructure and needs the same rigor: it is the first time this tool calls a privileged API on the user's behalf.

| Detail | Answer |
|--------|--------|
| What it does | Invite a team member (creates their Supabase Auth login and their role row), deactivate a team member (bans their Auth login and marks their role row inactive), reset a team member's password (generates a new starter password), reassign a team member's role or Admin status |
| What triggers it | The Admin clicking a button in the Admin Panel — always user-triggered, never automatic |
| Function placement | **Netlify Function.** All four actions require Supabase's Admin API, which needs the **service role key** — a key that must never reach the browser. The function receives the caller's session, verifies server-side (never trusting anything the browser sends) that the caller is authenticated **and** currently holds Admin, then performs the privileged action using the service role key |
| Who can call it | Only the current Admin. The function checks this itself on every call — it does not rely on the UI hiding the button, since a hidden button is not a security boundary |
| What "deactivate" does | Two things together: sets `is_active = false` on the person's row in the new roles table, **and** bans their Supabase Auth account (via the Admin API) so they cannot log in at all, even with a valid password. Reactivating reverses both. |
| What "reset password" does | The function generates a new starter password via the Admin API and returns it once to the Admin's screen (never emailed, never logged); the Admin hands it to the person directly, exactly as today, just triggered from the tool instead of the Supabase dashboard |
| Failure handling | Any failure (network, Supabase API error, the caller losing Admin mid-request) is shown plainly to the Admin with no partial effect — the function either completes an action fully or leaves the prior state untouched. No retries, no queue. |

> The service role key must never appear in any HTML, JavaScript, or publicly accessible file. It is stored as a Netlify environment variable and read only inside the Netlify Function (Section 11). Claude Code must enforce this.

---

## Section 4 — Stack and Deployment

*(unchanged from v1.1 — same repo, same Netlify site, same Supabase project)*

### All Tiers

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind CSS + shadcn/ui (same stack as the portal) |
| Deployment target | Netlify — its own site, separate from the portal's `the-corporate-sep` site |
| Netlify MCP | Not active — deployment will be done manually through the Netlify dashboard |
| Platform owner | Isa, personally |

**GitHub:** This is an iteration — the dashboard keeps its existing repo. Do not create a new one.

---

### CONDITIONAL: Supabase project — only complete if Tier 2 or Tier 3

**Supabase project status:** Existing — the same project as v1.1.

**Supabase plan:** Free — unchanged. Pauses after roughly one week of no traffic; a pause affects both tools (the portal and this dashboard) at once.

**If existing:**

| Detail | Answer |
|--------|--------|
| Project name | The Corporate |
| Project ID | `smnrfopzzzhazkehcqqn` (URL `https://smnrfopzzzhazkehcqqn.supabase.co`) |
| supabase-setup.md location | docs/supabase-setup.md in the project folder |

> Claude Code will read supabase-setup.md before making any schema changes. It will not recreate tables or policies that already exist.

---

### CONDITIONAL: Only complete if this tool is part of a stack

*(unchanged from v1.1)*

**Stack name / Supabase project name:** The Corporate

**This tool's role in the stack:** Tool B — internal review dashboard

**Other tools in this stack:**

| Tool | Tier | Role in the stack |
|------|------|------------------|
| The Corporate Supplier Sustainability Portal 2026 (Tool A) | Tier 2 | Public, no-login submission portal. Created the schema. Writes to `companies` and `submissions`. |
| The Corporate Supplier Review Dashboard 2026 (Tool B — this tool) | Tier 3 | Internal, login-protected review dashboard, now with roles. |

**Build order status:** satisfied — no change needed; this iteration only adds to the existing schema.

---

## Section 5 — Data Architecture

### CONDITIONAL: Only complete if Data Model is D3

**Existing data the dashboard reads (owned by the portal — unchanged, do not alter):**

*(identical to v1.1 — see `companies` and `submissions` columns already documented in docs/supabase-setup.md)*

**Data added in v1.1 (unchanged in v2.0):** `submissions.status`, and the full `submission_status_changes` table (see docs/supabase-setup.md).

**New data this build (v2.0) adds:**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| `user_roles.id` | Row ID | UUID (auto) | Automatic | Yes |
| `user_roles.auth_user_id` | Which login this row belongs to | UUID (FK → `auth.users.id`, unique) | Automatic, set when the admin invites the person | Yes |
| `user_roles.email` | The person's email, stored alongside the login for display in the Admin Panel | Text | Admin, at invite time | Yes |
| `user_roles.role` | `ehs`, `esg`, or `procurement` | Text, check-constrained to those three values | Admin, at invite time; changeable later | Yes |
| `user_roles.is_admin` | Whether this account currently holds the Admin capability | Boolean, default `false` | Admin, when reassigning | Yes |
| `user_roles.is_active` | Whether this account's access is currently live | Boolean, default `true` | Automatic (`true` on invite); Admin (`false` on deactivate, `true` on reactivate) | Yes |
| `user_roles.created_at` | When the account was invited | Timestamp, default `now()` | Automatic | Yes |
| `user_roles.updated_at` | When the role row was last changed | Timestamp | Automatic, on every update | Yes |

**Tables needed:**

| Table name | What it stores | Key fields |
|-----------|---------------|-----------|
| `companies` | *Existing, unchanged.* | — |
| `submissions` | *Existing, unchanged since v1.1.* | — |
| `submission_status_changes` | *Existing, unchanged since v1.1.* | — |
| `user_roles` | *New in v2.0.* One row per team member's login. Exactly one row may have `is_admin = true` at any time — enforced by a partial unique index or a check inside the admin function, never left to the UI alone. | auth_user_id, email, role, is_admin, is_active |

**Database logic this build adds (Claude Code builds via MCP):**

1. **`user_roles` table**, as above, with a constraint or trigger guaranteeing at most one `is_admin = true` row exists at any time, and that unsetting the only admin in the same statement that doesn't set a new one is refused (this is a data-integrity rule, not just a UI rule — it must hold even if called directly).
2. **Row-restricted read policy on `user_roles`:** an authenticated user may read only their own row (`auth_user_id = auth.uid()`), so the client can show or hide the Admin Panel entry point and label the person's own role. No authenticated user — Admin included — reads the full roster through this policy; the Admin Panel's roster comes from the Netlify Function (which uses the service role key and bypasses RLS by design, after checking the caller is Admin).
3. **No direct authenticated writes to `user_roles`.** All inserts, updates and deletes happen only through the Netlify Function using the service role key. There is no RLS policy granting authenticated insert/update/delete on this table — the table simply has none, so any attempt is refused by default.
4. **`set_submission_status()` — updated.** In addition to its existing v1.1 refusals (null `auth.uid()`, target other than `accepted`/`needs_review`, blank reason for `needs_review`, no-op, superseded submission), it now also refuses unless the caller's `user_roles` row has `role` in (`ehs`, `esg`) **and** `is_active = true`. Procurement and any deactivated account are refused at the function, not only hidden in the UI.
5. **`submission_status_changes.reason`** is unchanged structurally, but is now the field referred to in the UI as "review comment" — same column, new label, now writable only by EHS/ESG (enforced by rule 4 above, since it is only ever written by `set_submission_status()`).

**File storage:** No — unchanged.

**Derived or calculated data:** Unchanged from v1.1, plus: whether the current user is Admin, and what role they hold, is read once per session from their own `user_roles` row and used only to decide what the UI shows — never trusted as the sole enforcement, since Section 5 rule 4 enforces it again at the database.

---

## Section 6 — Access and Permissions

### CONDITIONAL: Only complete if Access Model is A2 or A3

**Auth configuration:**

| Detail | Answer |
|--------|--------|
| Login, as built | Email and password, admin-managed — unchanged. **What changes:** inviting a person, deactivating them, resetting their password, and reassigning their role now happen from the in-app **Admin Panel** (via the Netlify Function in Section 3), instead of the Supabase dashboard's Authentication → Users screen. The mechanics underneath are the same admin-managed model; only the door the admin uses changed. |
| Named first holders | EHS Manager — Isabela, isabela@gmail.com. ESG (holds Admin) — Isa, isadorapined@gmail.com. Procurement — isabel, isabel@gmail.com. |
| Signup model | Invite-only, unchanged. "Allow new users to sign up" stays off at the Supabase Auth level — the Admin Panel calls the Admin API server-side, which is a separate path from public signup and is unaffected by that setting. |
| Login, upgrade path | Unchanged from v1.1 — the team is small (three people); email-and-password admin-managed remains appropriate. Revisit (magic link, OAuth, or SSO) only if the team grows meaningfully beyond this size. |

> **Privacy note:** User accounts store an email address, a role, and admin/active status. For internal and client tools this falls under the organisation's existing privacy framework rather than a consent flow.

**RLS rules — who can read and write what:**

RLS stays enabled on every table, and is never disabled. Rows unchanged from v1.1 (`companies`, `submissions`, `submission_status_changes` for the anon role) are not repeated here — only what changes or is new.

| Table | User type | Can read | Can insert | Can update | Can delete |
|-------|----------|----------|------------|------------|------------|
| `companies` | Any authenticated user (EHS, ESG, Procurement) | All rows — unchanged | No | No | No |
| `submissions` | Any authenticated user | All rows — unchanged | No | No — status changes only through `set_submission_status()`, and only for EHS/ESG (Section 5, rule 4) | No |
| `submission_status_changes` | Any authenticated user | All rows — unchanged (Procurement can read the review comment, just never write it) | No | No | No |
| `user_roles` | Unauthenticated (anon) | No | No | No | No |
| `user_roles` | Any authenticated user | **Own row only** (`auth_user_id = auth.uid()`) | No | No | No |
| `user_roles` | The Netlify admin function (service role key) | All rows | Yes — on invite | Yes — on deactivate/reactivate/reassign | No — deactivate, never delete (Section 3) |

The dashboard reads with the logged-in user's session through the anon/publishable key for everything except the four admin actions, which go through the Netlify Function using the service role key. The service role key is never used directly by the browser.

---

## Section 7 — GDPR

### MANDATORY DECISION: Complete this section for every D3 tool.

**GDPR outcome:** Not applicable — unchanged from v1.1. This iteration adds a role, an admin flag and an active flag to each team member's account; these are organisational metadata about an internal, invite-only login, not a new category of personal data. The dashboard still collects no personal data through any form or upload — it only displays what the portal already collected and manages the internal team's own login accounts, which is already covered by Section 6's privacy note.

---

## Section 8 — Screen and UI Structure

Unchanged: the Login view, the three-section Dashboard, and the supplier detail page (Section 8 of v1.1) all still exist exactly as specified there. What changes:

### View 2 — Dashboard — Section C — Register and Detail page (updated)

- **What changes for EHS/ESG:** No change from v1.1 — the status controls and the review-comment field remain exactly as before.
- **What changes for Procurement:** The detail page renders identically (status badge, review comment, timeline), but with no controls. No "Save status" button, no editable comment field, no way to trigger `set_submission_status()`. This is enforced in the UI **and** independently by the database function (Section 5, rule 4) — a Procurement account calling the function directly (for example via the browser console) is refused the same as if the button existed and were clicked.
- The top bar now also shows the logged-in user's role next to their email (e.g. "isabela@gmail.com · EHS").

### View 4 — Admin Panel *(new)*

- **Purpose:** Let the current Admin manage the team's accounts without touching the Supabase dashboard.
- **What is visible:** Visible only to the account currently holding Admin — for everyone else, there is no link to this view and no route reaches it (a direct visit redirects to the Dashboard). A table of every team member: email, role, Admin (yes/no), Active (yes/no), invited-on date.
- **User actions:**
  - **Invite:** a form (email + role) that creates the login and the `user_roles` row. On success, shows the generated starter password once, with a reminder to hand it over directly and that it will not be shown again.
  - **Deactivate / Reactivate:** a toggle per row (except the admin's own row, which cannot deactivate itself without first handing Admin to someone else).
  - **Reset password:** a button per row that generates a new starter password and shows it once, the same way invite does.
  - **Reassign role:** a dropdown per row (EHS / ESG / Procurement).
  - **Move Admin:** a control that grants Admin to another EHS/ESG row and simultaneously revokes it from the current holder. Blocked if the target account is inactive or is Procurement (Admin can only sit on an EHS or ESG account).
- **What happens next:** Every action calls the Netlify Function (Section 3) and refreshes the table from its response. A failed action shows the error plainly and changes nothing.

---

## Section 9 — Logic and Calculations

Sections 9.1–9.4 (status lifecycle, superseding, risk flags, overview counts) are unchanged from v1.1.

### 9.5 — Role permissions *(new)*

**What is calculated:** Whether the current user may see the Admin Panel and whether they may change a submission's status/comment.

**Inputs:** The current user's own `user_roles` row (`role`, `is_admin`, `is_active`), read once at login and re-checked by the database on every write attempt.

**Rules:**
- `role` in (`ehs`, `esg`) and `is_active = true` → can set status and write the review comment.
- `role = 'procurement'`, or any role with `is_active = false` → view-only everywhere; no controls rendered; the function refuses if called directly.
- `is_admin = true` → sees and may use the Admin Panel, in addition to whatever their `role` otherwise permits.

**Edge cases:**
- **Role changes mid-session:** because the check is a live read against `user_roles` (never baked into a long-lived token), a reassignment takes effect on the person's very next action — they do not need to log out and back in.
- **Deactivation mid-session:** the person's Supabase Auth session is banned server-side by the admin action, so their next request (page load or API call) fails authentication entirely, not just the role check.
- **The only admin's own row:** the UI blocks self-deactivation and blocks removing one's own Admin status without naming a successor in the same action; the database also refuses it (Section 5), so this cannot be bypassed by calling the function directly.

---

## Section 10 — Brand and Visual Direction

Unchanged from v1.1. The Admin Panel uses the same Data Leaf tokens as every other view — no new colours or type.

---

## Section 11 — API and Credentials

| Service | What it does in this tool | Key required | Where key is stored |
|---------|--------------------------|-------------|-------------------|
| Supabase | Database reads, status writes via `set_submission_status()`, email-and-password Auth | Anon / publishable key (public, browser-safe) | Netlify environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, plus `.env.local` (gitignored) for local dev — unchanged from v1.1 |
| Supabase Admin API *(new in v2.0)* | Invite, deactivate, reset password, and reassign role — the four Admin Panel actions | **Service role key** — server-side only, bypasses RLS, must never reach the browser | Netlify environment variable, read only inside the new Netlify Function; never `VITE_`-prefixed, never in any committed file |

> **Security rule — no exceptions:** No API key, token, password, or credential may appear in any HTML file, any JavaScript file, or any file committed to GitHub. Claude Code must enforce this regardless of tier or context.

**Environment variable contract:**

| Variable name (exact) | Read by | Set where | Public or secret |
|-----------------------|---------|-----------|------------------|
| `VITE_SUPABASE_URL` | the browser | Netlify env — unchanged | public |
| `VITE_SUPABASE_ANON_KEY` | the browser | Netlify env — unchanged | public |
| `SUPABASE_SERVICE_ROLE_KEY` *(new)* | the Netlify Function only | Netlify env — added in this build | **secret** — copied with the Supabase dashboard's copy button, never by mouse selection, same lesson as the anon key in v1.1 |

**Credentials readiness:**

| Credential | Status | Where to get it |
|-----------|--------|----------------|
| Supabase URL + anon key | Available — the same values already in use | — |
| Supabase service role key | Available — exists on the project already, simply unused until now | Supabase dashboard → Project Settings → API (copy button) |
| Team login accounts | Isa's account likely already exists from v1.1; Isabela and isabel's accounts are created fresh through the new Admin Panel once it is built | Admin Panel, once built (see Section 15 open question) |

---

## Section 12 — Out of Scope — Phase 2

| Deferred feature | Reason it is deferred |
|-----------------|----------------------|
| In-app "forgot password" self-service reset | Not requested. The admin resets it from the Admin Panel instead. |
| Automatic email on invite or password reset | Not requested — handover stays manual (Slack/in person), same as v1.1. No email service added. |
| Audit log of admin actions (who invited/deactivated/reassigned whom, and when) | Not requested for this version. `submission_status_changes` remains the only audit trail; admin actions themselves are not logged beyond the current state of `user_roles`. |
| More than one simultaneous Admin | Not requested — exactly one at a time, by design (Section 2). |
| A fourth, dedicated "Admin" role separate from EHS/ESG | Not requested — Admin is a capability layered on an EHS or ESG account, never a standalone role. |
| Any change to the supplier portal's code, pages, fields, routes, submission flow, workbook or capture screens | Explicitly excluded, unchanged from v1.1. |
| Messaging or notifying suppliers from the dashboard | Communication about "Needs review" stays outside the platform, unchanged. |
| Supplier-facing visibility of their status | Unchanged. |
| CSV or PDF export of any view | Unchanged. |
| AI features (summarising, classifying or scoring answers) | Unchanged. |
| Scheduled automation (digests, reminders) | Unchanged. |
| Weighting, scoring or grading risk flags | Unchanged — still a plain count. |
| Editing supplier answers or identity from the dashboard | Unchanged — read-only apart from status/comment. |
| Deleting submissions or companies from the dashboard | Unchanged — still a Supabase dashboard task. |
| Viewing or downloading attached files | Unchanged. |
| Per-submission historical contact details | Unchanged. |

---

## Section 13 — Acceptance Criteria

Criteria 1–22 from v1.1 (login, signup disabled, anon lockout, overview, flags, register, detail, status lifecycle, superseding, brand, deployment) still apply and are unchanged. New criteria for v2.0:

| # | What to verify | Expected result | Done? |
|---|---------------|-----------------|-------|
| 23 | EHS/ESG can review | Logged in as Isabela or Isa, the status controls and comment field appear on a submission's detail page and work exactly as in v1.1. | [ ] |
| 24 | Procurement cannot review — UI | Logged in as isabel, no status control or comment field appears anywhere. Overview, Risk Flag Board, Register and every detail page are fully visible, including existing comment text. | [ ] |
| 25 | Procurement cannot review — function | Calling `set_submission_status()` directly as isabel's authenticated session is refused, regardless of parameters. | [ ] |
| 26 | Deactivated account is fully locked out | An admin deactivates a test account; that account's next login attempt fails, and any already-open session's next request also fails — not just a role check, a full authentication failure. | [ ] |
| 27 | Admin Panel visibility | Only the current Admin sees the Admin Panel entry point and can reach View 4. A direct visit to its URL by anyone else redirects to the Dashboard. | [ ] |
| 28 | Invite works | Admin invites a test email with a role; a working login is created with that role, `is_active = true`, and the starter password shown once is usable to log in. | [ ] |
| 29 | Reset password works | Admin resets a test account's password; the old password stops working and the new one shown once works. | [ ] |
| 30 | Reassign role takes effect immediately | Admin changes a logged-in test account's role from Procurement to EHS; without logging out, that account's next status-change attempt succeeds. | [ ] |
| 31 | Exactly one admin, always | Attempting to remove Admin from the only current holder without naming a successor is refused, both in the UI and if the function is called directly. Granting Admin to a second account automatically revokes it from the first. | [ ] |
| 32 | Admin cannot self-lock-out | The current Admin cannot deactivate their own account, and cannot drop their own Admin status without handing it to someone else in the same action. | [ ] |
| 33 | No client-side roster leak | An authenticated non-admin account's direct query against `user_roles` returns only their own row, never the full team list. | [ ] |
| 34 | Service role key never exposed | The built site's JavaScript bundle contains no occurrence of the service role key; it exists only in the Netlify Function's server-side environment. | [ ] |

---

## Section 14 — Build Path

**This tool's tier:** Tier 3 *(unchanged)*

> **Note on the Access Architect:** v1.0/v1.1 of this tool were built as a single-run spec, without a separate `access-matrix.md`/`user-stories.md` pass — the RLS grid was derived directly in Section 6, as the template's fallback allows for a project already following that pattern. This iteration continues that same pattern for consistency. Given the added complexity here — a real admin capability with service-role privileges and role-gated writes — it would also be reasonable to run the Access Architect's short run now before handing this spec to the Project Governor, even though the earlier versions didn't use it. That's the builder's call; either path is workable, but the Access Architect would give the new `user_roles` table and its policies an extra, purpose-built review.

---

### Pre-build steps — complete these before opening Claude Code

- [ ] This spec (v2.0) confirmed by the builder
- [ ] Optional but recommended given the scope: Access Architect short run against `user_roles` and the updated `set_submission_status()` rule
- [ ] Project Governor skill — updated CLAUDE.md and PROGRESS.md produced from this spec, in **Iteration Mode** (keeps existing PROGRESS.md history)
- [ ] This spec (v2.0) uploaded to the existing GitHub repo root, replacing v1.1
- [ ] Updated CLAUDE.md and PROGRESS.md uploaded to the repo root
- [ ] No new GitHub repo — this is an iteration of the existing dashboard repo
- [ ] All credentials identified: the service role key is available on the existing Supabase project, just not yet used by this tool (Section 11)

---

### Tier 3 — build session (this iteration)

- [ ] Open Claude Code in the existing project folder
- [ ] Claude Code reads product-spec.md (v2.0), CLAUDE.md, and PROGRESS.md, and docs/supabase-setup.md before touching the database
- [ ] Claude Code builds the `user_roles` table via Supabase MCP, with RLS as specified in Section 6, and the single-admin constraint
- [ ] Claude Code updates `set_submission_status()` to add the EHS/ESG-and-active check
- [ ] Claude Code creates the new Netlify Function for the four admin actions, wired to the service role key as a Netlify environment variable
- [ ] Claude Code updates docs/supabase-setup.md with the new table, policies, and the updated function
- [ ] Claude Code builds the Admin Panel (View 4) and updates the Register/detail views to hide controls for Procurement
- [ ] Builder adds `SUPABASE_SERVICE_ROLE_KEY` to Netlify's environment variables (copied with the dashboard's copy button)
- [ ] Builder confirms Isa's existing account (if any) gets a `user_roles` row with `role = 'esg'`, `is_admin = true`; Isabela and isabel are invited fresh through the new Admin Panel once it exists
- [ ] Test locally, including acceptance criteria 23–34, before deploying
- [ ] Push to main → Netlify auto-deploys; "Deploy project without cache" after the env var change
- [ ] Optional post-build: run Supabase QA skill to verify the new table's RLS and the function's grants

---

## Section 15 — Open Questions

| Question | Who answers it | Blocking? |
|----------|---------------|-----------|
| Does Isa's existing v1.1 login already exist in Supabase Auth, or does it also need to go through the new invite flow? | Builder | No — resolvable during build by checking Authentication → Users |
| Should the single-admin constraint be a hard database constraint (e.g. a partial unique index on `is_admin = true`) or enforced only inside the Netlify Function's transaction logic? | Builder / Claude Code | No — Claude Code should default to the database constraint for defense-in-depth, per Section 5 |
| *(Carried forward from v1.1, still open)* Should the `isa` test company and its submission be removed before real use? | Builder | No |
| *(Carried forward from v1.1, still open)* Free plan pauses after about a week idle and takes both tools down. Revisit if used for real. | Builder | No |

---

## Section 16 — Tool Version History

| Version | Date | What changed in the tool |
|---------|------|--------------------------|
| v1.0 | 18 September 2026 | Initial build |
| v1.1 | 18 September 2026 | Pre-build correction from verification against the portal's `src/lib`. §9.3 flag rules rewritten for the guided form's non-Yes/No options. EcoVadis keys and label source named. Acceptance criterion 7 extended. |
| v2.0 | 25 September 2026 | Access model changed A2 → A3. Added roles EHS Manager, ESG and Procurement with different permissions: EHS/ESG can set review status and write the review comment; Procurement is view-only everywhere, enforced both in the UI and at `set_submission_status()`. Added an Admin capability (exactly one EHS/ESG account at a time) with a new in-app Admin Panel to invite, deactivate, reset passwords, and reassign roles — backed by a new `user_roles` table and the tool's first server-side function (Netlify Function using the Supabase service role key). No email arm added; invite/reset handover stays manual. |

---

*This spec is written for Claude Code. It assumes zero prior context. Every decision, rule, and requirement must be explicit enough that the builder can hand this document to Claude Code without a single verbal explanation.*
