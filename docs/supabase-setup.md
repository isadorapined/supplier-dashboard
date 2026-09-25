# Supabase Setup — The Corporate (portal + review dashboard)

> **This file is the schema source of truth.** It supersedes the provisional
> schema in CLAUDE.md from the moment it exists. Update it at every save point
> that touches the database — a table, a column, a policy, or a function.

**Last updated:** 25 September 2026 — dashboard session 2 (v2.0 access phase)

> **Two tools, one database, two access models.** This project is shared by
> **Tool A — The Corporate Supplier Sustainability Portal 2026** (public;
> since v3.1 a supplier verifies an email by **magic link** before
> submitting — open signup) and **Tool B — The Corporate Supplier Review
> Dashboard 2026** (internal; email-and-password login **plus roles** from
> `user_roles`, v2.0). Because every verified supplier is `authenticated`,
> **`authenticated` is not the dashboard team.** Every dashboard gate checks
> for an active `user_roles` row, which suppliers never have. Both repos carry a copy of this file. The dashboard's copy
> is now the newer one: **copy it back into the portal repo's `docs/`** so the
> portal's next session does not work from a stale schema.

---

## Project

| Detail | Value |
|--------|-------|
| Project name | **The Corporate** |
| Project ref / ID | `smnrfopzzzhazkehcqqn` |
| Project URL | `https://smnrfopzzzhazkehcqqn.supabase.co` |
| Region | us-east-1 |
| Postgres | 17.6 |
| Plan | **Free** |
| Organisation | `isadorapined's Org` (`kbhvhskoevzewhgfybfv`) |
| Created | 6 September 2026 |

### Why this project, and not `the-corporate-supplier-portal`

Spec v3.0 §4 and CLAUDE.md both said the project was *new* and should be
created during the build session under the name `the-corporate-supplier-portal`.
When session 3 opened, this project already existed in the builder's
organisation with an empty `public` schema. The builder confirmed reusing it
rather than creating a second one.

The name is also a better fit for the spec's own stated rationale: it wanted a
project "named after the client/organisational context … not after this
specific tool, so it can hold future tools in the same context — including the
v4 login work and any later internal review tool." `The Corporate` is exactly
that; the proposed name was not.

> **Free plan caveat.** The project pauses after roughly a week without
> traffic, and a paused project refuses writes. That is acceptable for a
> class/portfolio build, but it is the most likely cause of a supplier seeing
> the save-failure message in the wild. See *Submit failure* below.

---

## Tables

### `companies`

One row per supplier company, reused across every submission that company
makes. Never readable by the anon key.

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key |
| `legal_name` | `text` | no | — | Matched on `lower(btrim(legal_name))` |
| `registered_country` | `text` | no | — | |
| `contact_name` | `text` | no | — | Refreshed on every repeat submission |
| `contact_title` | `text` | no | — | Refreshed on every repeat submission |
| `contact_email` | `text` | no | — | Refreshed on every repeat submission |
| `created_at` | `timestamptz` | no | `now()` | First seen |
| `updated_at` | `timestamptz` | no | `now()` | Set by `resolve_company` on a match |

**Indexes**

- `companies_pkey` — primary key on `id`
- `companies_legal_name_key` — **unique** on `lower(btrim(legal_name))`

That unique index is the spec's matching rule enforced in the database rather
than trusted to the client. It is what makes match-or-insert atomic: two
simultaneous submissions from the same company cannot both insert a row.

### `submissions`

One completed submission per row. A company has many submissions. Insert-only
for the anon key.

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key |
| `company_id` | `uuid` | no | — | FK → `companies.id`, `on delete cascade` |
| `path` | `text` | no | — | Check: `ecovadis` \| `full` |
| `door` | `text` | no | — | Check: `ecovadis_upload` \| `ecovadis_form` \| `assessment_guided` \| `assessment_upload` |
| `answers` | `jsonb` | no | `'{}'` | Keyed by question id. Notes are stored as `<id>__notes`. Identity is never included. |
| `attached_file_name` | `text` | yes | — | Filename only |
| `attached_file_size` | `integer` | yes | — | Bytes; check `>= 0` |
| `signatory_name` | `text` | yes | — | Path B only |
| `declaration_date` | `date` | yes | — | Path B only |
| `submitted_at` | `timestamptz` | no | `now()` | |
| `status` | `text` | no | `'new'` | **Added by the dashboard.** Check: `new` \| `accepted` \| `needs_review` \| `superseded` |
| `verified_user_id` | `uuid` | yes | `auth.uid()` | **Added by the portal (v3.1).** FK → `auth.users.id`. The verifying supplier's session; null only on rows written before v3.1 |
| `contact_email` | `text` | yes | `auth.email()` | **Added by the portal (v3.1).** The verified email; checked by the portal's insert policy |

**Indexes**

- `submissions_pkey` — primary key on `id`
- `submissions_company_id_idx` — on `company_id`
- `submissions_submitted_at_idx` — on `submitted_at desc`
- `submissions_current_idx` — on `(company_id, path)` where `status <> 'superseded'`

> **`status` is invisible to the portal.** The portal's insert does not send
> it, so every portal submission arrives as `new` with no portal code change.
> Nobody sets `new` or `superseded` by hand: `new` is the default and
> `superseded` is written only by the trigger below.

> **No file is ever stored.** `attached_file_name` and `attached_file_size` are
> the only trace of the EcoVadis PDF or the uploaded workbook. Nothing goes to
> Supabase Storage, and the file bytes never leave the browser. Spec §5, §12,
> acceptance criterion 11.

### `submission_status_changes`

*Added by the dashboard.* One row per status change, manual or automatic.
Append-only: no user role can insert, update or delete a row. It is written
only by `supersede_previous_submissions()` and `set_submission_status()`.

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key |
| `submission_id` | `uuid` | no | — | FK → `submissions.id`, `on delete cascade` |
| `from_status` | `text` | no | — | Status before the change |
| `to_status` | `text` | no | — | Status after the change |
| `reason` | `text` | yes | — | Required by the function when `to_status = 'needs_review'` |
| `changed_by` | `uuid` | yes | — | `auth.uid()`; **null means automatic** |
| `changed_by_email` | `text` | yes | — | Email at change time; **null means automatic** |
| `changed_at` | `timestamptz` | no | `now()` | |

**Indexes**

- `submission_status_changes_pkey` — primary key on `id`
- `submission_status_changes_submission_id_idx` — on `(submission_id, changed_at desc)`

### `user_roles`

*Added by the dashboard (v2.0).* The dashboard team: one row per login.
**Never deleted** — deactivated instead. Written only by the Netlify admin
function (`netlify/functions/admin-actions.js`) with the service role key;
no browser session can write it.

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key |
| `auth_user_id` | `uuid` | no | — | **Unique**, FK → `auth.users.id`. Set by the function at invite time |
| `email` | `text` | no | — | For the Admin Panel roster |
| `role` | `text` | no | — | Check: `ehs` \| `esg` \| `procurement` |
| `is_admin` | `boolean` | no | `false` | Exactly one `true` row at all times |
| `is_active` | `boolean` | no | `true` | `false` = deactivated (and the Auth login is banned) |
| `created_at` | `timestamptz` | no | `now()` | Shown as "Invited on" |
| `updated_at` | `timestamptz` | no | `now()` | Set by `user_roles_touch_updated_at` on every update |

**Constraints — the Admin rules, held by the database, not the UI**

| Object | What it refuses |
|--------|-----------------|
| `user_roles_one_admin` — partial unique index on `(is_admin) where is_admin` | a second Admin |
| `user_roles_require_one_admin` — constraint trigger, `deferrable initially immediate` (checked at the end of each statement) | zero Admins: removing Admin without granting it to someone in the **same statement**, or deleting the Admin's row |
| `user_roles_admin_is_active_reviewer` — check `not is_admin or (is_active and role in ('ehs','esg'))` | Admin on a Procurement or inactive account — which is also what refuses the Admin deactivating or demoting themselves |

Moving Admin is therefore **one statement**: the function upserts the current
holder (`is_admin = false`, sent first) and the successor (`is_admin = true`)
together. Both trigger functions have execute revoked from `public`, `anon`
and `authenticated`.

---

## RLS

**RLS is enabled on every table and must never be disabled.** If a query fails,
fix the policy or the query.

> RLS is not an authentication feature. The anon key ships inside both tools'
> public JavaScript bundles, and since portal v3.1 anyone can become
> `authenticated` by verifying an email. RLS is what makes both of those safe.

| Table | Policy | Role | Command | Owner |
|-------|--------|------|---------|-------|
| `companies` | `team member may read companies` | `authenticated` | `SELECT` using *active `user_roles` row for `auth.uid()`* | dashboard |
| `submissions` | `verified supplier may insert own submission` | `authenticated` | `INSERT` with check `contact_email = auth.email() and verified_user_id = auth.uid() and status = 'new'` | portal (v3.1) |
| `submissions` | `team member may read submissions` | `authenticated` | `SELECT` using *active `user_roles` row* | dashboard |
| `submission_status_changes` | `team member may read the status log` | `authenticated` | `SELECT` using *active `user_roles` row* | dashboard |
| `user_roles` | `team member may read own role` | `authenticated` | `SELECT` using `auth_user_id = auth.uid()` | dashboard |

"Active `user_roles` row" is
`exists (select 1 from user_roles r where r.auth_user_id = (select auth.uid()) and r.is_active)`.
Every role — EHS, ESG, Procurement — reads the same rows (access matrix §4:
no column exceptions). A verified supplier has no row, so reads nothing. A
deactivated team member's still-open session reads nothing on its next request.

**Table grants.** `anon` has no grant on `companies`, `submissions` (revoked
by the portal's `v31_close_anon_write_path`) or `user_roles`. `authenticated`
has `SELECT` only on `user_roles`. There is **no anon policy on any table** —
the portal's anon insert policy was dropped at its v3.1 cutover.

**No write policy exists for any team role on any table.** Status changes go
only through `set_submission_status()`; the log is written only by that
function and the superseding trigger; `user_roles` only by the admin function.
Never add an `UPDATE` policy to `submissions`, and never a write policy to
`user_roles`.

> **Superseded (history):** v1.1 read policies were `authenticated … using
> (true)`, which held only while signup was off. Portal v3.1 turned signup on,
> and its `v31_scope_dashboard_access_to_reviewers` migration narrowed them to
> a JWT flag (`app_metadata.role = 'reviewer'`) as a stopgap. Dashboard v2.0
> replaced that flag with the `user_roles` check above. `app_metadata.role`
> is no longer read by anything; Isa's account still carries it, harmlessly.

### Refusal test — half A (25 September 2026, dashboard session 2)

Run through Supabase MCP as each caller (`set local role` plus
`request.jwt.claims`), inside a transaction that was rolled back. A stand-in
Procurement row was attached to an existing test login for the run and did
not persist.

| Caller | Attempt | Result |
|--------|---------|--------|
| anon | read `companies` / `submissions` / `user_roles` | refused — `permission denied` |
| anon | read `submission_status_changes` | 0 rows |
| anon | `set_submission_status()` | refused — `permission denied for function` |
| verified supplier (authenticated, no role row) | read all four tables | 0 rows each |
| verified supplier | `set_submission_status()` | refused — `DL403` |
| verified supplier | insert own `user_roles` row | refused — `permission denied` |
| Procurement | read companies / submissions / status log | all rows (3 / 4 / 4) |
| Procurement | read `user_roles` | own row only (1); Isa's row: 0 |
| Procurement | `set_submission_status()` → accepted / needs_review | refused — `DL403`, both |
| Procurement | update own role / delete `user_roles` | refused — `permission denied` |
| Procurement | direct update / delete on `submissions` | 0 rows affected |
| Procurement | insert into status log | refused — RLS |
| Isa (ESG, Admin) | read `user_roles` | own row only (1); other row: 0 |
| Isa | direct update of her own `user_roles` row | refused — `permission denied` |
| Isa | `set_submission_status()` | reaches the v1.1 checks (`DL422` no-op on that row) — role check passed |
| deactivated Procurement, old session | read submissions / companies | 0 rows |
| Procurement reassigned to EHS, same session | `set_submission_status()` | **allowed** on the next call |
| service role (the function's path) | remove Admin with no successor | refused — `Exactly one Admin is required` |
| service role | deactivate Admin / make Admin Procurement | refused — check `user_roles_admin_is_active_reviewer` |
| service role | grant a second Admin | refused — `user_roles_one_admin` |
| service role | delete the Admin's row | refused — `Exactly one Admin is required` |
| service role | move Admin in one statement | succeeds |

## Functions

### `public.resolve_company(p_legal_name, p_registered_country, p_contact_name, p_contact_title, p_contact_email) → uuid`

`SECURITY DEFINER`, `set search_path = public, pg_temp`. **Owned by the
portal.** Since portal v3.1, execute is granted to `authenticated` only (a
verified supplier) and revoked from `anon` and `public`. The dashboard never
calls it. A dashboard team member could technically call it too — it only
matches or inserts a company and returns an id, so it reveals nothing.

Implements spec §5's matching rule server-side:

- Matches on `lower(btrim(legal_name))` — case-insensitive, surrounding
  whitespace ignored. **Never fuzzy.**
- On a match: reuses the row and overwrites `registered_country`,
  `contact_name`, `contact_title`, `contact_email`, and `updated_at`.
- On no match: inserts a new row.
- Returns the company id and nothing else, so no other company's details can
  reach the browser.

Implemented as a single `INSERT … ON CONFLICT … DO UPDATE`, which is what makes
it atomic against concurrent submissions.

The Supabase linter may report `authenticated_security_definer_function_executable`
for this function. That is intentional — verified suppliers calling it is the
portal's design.

### `public.supersede_previous_submissions()` — AFTER INSERT trigger on `submissions`

*Added by the dashboard.* `SECURITY DEFINER`, `set search_path = public, pg_temp`.
Execute is revoked from `public`, `anon` and `authenticated` — only the trigger
calls it.

When a submission is saved, every **other** row with the same `company_id` and
the **same `path`** whose status is not already `superseded` becomes
`superseded`, and one log row is written per row changed, with `changed_by` and
`changed_by_email` null and reason `Automatic — newer submission received`. The
log records each row's **actual** previous status, which may be `accepted` or
`needs_review`, not just `new`.

**Same route only.** An EcoVadis submission never supersedes a Questionnaire
one, so a company can hold one current submission on each route at the same
time.

> **It never raises.** The body is wrapped in an exception handler that
> downgrades any unexpected error to a `WARNING` and still returns `NEW`. This
> trigger runs inside the portal's anon insert: if it raised, the portal would
> show the supplier its save-failure notice for a submission that was in fact
> saved. A row that fails to be superseded is visible and correctable; a false
> save failure is neither.

### `public.set_submission_status(p_submission_id uuid, p_new_status text, p_reason text) → void`

*Added by the dashboard; role check updated in v2.0.* `SECURITY DEFINER`,
`set search_path = public, pg_temp`. Execute granted to **`authenticated`
only**, revoked from `public` and `anon`.

The **only** way a status changes by hand. It refuses when:

| Condition | SQLSTATE | Message |
|-----------|----------|---------|
| `auth.uid()` is null | `DL401` | `Not signed in.` |
| caller has no `user_roles` row with `role in ('ehs','esg')` and `is_active` — Procurement, deactivated accounts, suppliers | `DL403` | `Only active EHS or ESG accounts can change a submission's status.` |
| target is not `accepted` or `needs_review` | `DL422` | `Status <x> cannot be set by hand.` |
| submission does not exist | `DL422` | `Submission not found.` |
| the row is `superseded` | `DL409` | `This submission has been superseded and is locked.` |
| the row is already that status (no-op) | `DL422` | `The submission is already <x>.` |
| `needs_review` with a blank/whitespace reason | `DL422` | `A reason is required for Needs review.` |

On success it updates `status` and inserts the log row **in one transaction**.
The reason is trimmed, and `changed_by` / `changed_by_email` are taken from
`auth.uid()` and `auth.jwt() ->> 'email'` — **never from a parameter**, so no
team member can attribute a change to a colleague. The row is locked with
`for update` so two people saving at once cannot both write a log entry.

The custom SQLSTATEs exist so the dashboard can tell `DL409` apart from a
general failure: the spec words those two on-screen messages differently.

The linter will report `anon_security_definer_function_executable` for this
function as it does for `resolve_company`. Expected — it is granted to
`authenticated`, not `anon`.

---

## Migrations applied

| Name | What it did |
|------|-------------|
| `v3_companies_submissions_schema` | Both tables, constraints, indexes, comments |
| `v3_rls_and_resolve_company` | RLS on both tables, the submissions insert policy, `resolve_company` |
| `v3_restrict_resolve_company_to_anon` | Revoked execute from `authenticated` (least privilege) |
| `dashboard_v1_submission_status_changes` | The log table, its index, RLS + authenticated select policy |
| `dashboard_v1_status_column_backfill_and_insert_policy` | `submissions.status` + check + index; the one-time backfill; tightened the anon insert policy to `status = 'new'` |
| `dashboard_v1_superseding_trigger` | `supersede_previous_submissions()` + the AFTER INSERT trigger |
| `dashboard_v1_superseding_trigger_real_from_status` | Logs each row's actual previous status instead of a hardcoded `new` |
| `dashboard_v1_set_submission_status` | `set_submission_status()`, granted to `authenticated` only |
| `dashboard_v1_authenticated_read_policies` | Authenticated select policies on `companies` and `submissions` |
| `v31_verified_supplier_insert_path` | *Portal v3.1.* `submissions.verified_user_id` + `contact_email`; the verified-supplier insert policy; `resolve_company` granted to `authenticated` |
| `v31_scope_dashboard_access_to_reviewers` | *Portal v3.1.* Stopgap: dashboard reads and `set_submission_status()` gated on JWT `app_metadata.role = 'reviewer'` |
| `v31_close_anon_write_path` | *Portal v3.1 cutover.* Dropped the anon insert policy; revoked `resolve_company` and both tables from `anon` |
| `dashboard_v2_user_roles_and_team_gate` | *Dashboard v2.0.* `user_roles` + its Admin constraints, RLS and grants; Isa seeded as ESG + Admin; the three read policies and `set_submission_status()` moved from the JWT flag to an active `user_roles` row. File: `supabase/migrations/20260925_dashboard_v2_user_roles_and_team_gate.sql` |

### One-time backfill (ran inside `dashboard_v1_status_column_backfill_and_insert_policy`)

For each `(company_id, path)` pair the most recent row by `submitted_at` stayed
`new`; every older row became `superseded` with an automatic log entry. `id`
breaks ties so two rows sharing a `submitted_at` still resolve to one winner.

Result at the time it ran (3 submissions):

| Company | Route | Submitted | Status after backfill |
|---------|-------|-----------|----------------------|
| `isa` | Questionnaire | 11 Sep 2026 14:53 | `superseded` (+ log entry) |
| `sustainOS` | Questionnaire | 11 Sep 2026 15:22 | `new` |
| `isa` | Questionnaire | 11 Sep 2026 18:42 | `new` |

It is written to be re-runnable safely, but it is not meant to run again: from
now on the trigger keeps the invariant.

---

## Auth

One Supabase Auth, two ways in:

| | Portal (Tool A, v3.1) | Dashboard (Tool B, v2.0) |
|---|---|---|
| Method | Magic link (passwordless) | Email and password |
| Who gets an account | Anyone who verifies an email — **"Enable sign-ups" is ON** | Only people the Admin invites from the Admin Panel |
| What the account can do | Insert its own submission | Whatever its `user_roles` row allows |

Signup being ON is the portal's design and is **no longer a dashboard
security control**: the dashboard's gate is the `user_roles` row, which only
the admin function can create. A login without one — every supplier — is
signed straight back out by the dashboard and reads nothing through RLS.

**Dashboard account management (v2.0)** happens in the in-app Admin Panel,
through `netlify/functions/admin-actions.js` with the service role key — not
in Authentication → Users:

| Action | Auth Admin API | `user_roles` |
|--------|----------------|--------------|
| Invite | `createUser` (email confirmed, generated starter password) | insert row (`is_active = true`); if the insert fails the new login is deleted again |
| Deactivate | ban (`ban_duration` ≈ 100 years) | `is_active = false`; if that fails the ban is lifted again |
| Reactivate | unban (`ban_duration: 'none'`) | `is_active = true` |
| Reset password | `updateUserById` with a new generated password | — |
| Reassign role | — | `role` |
| Move Admin | — | one upsert of both rows |

The starter password is returned once to the Admin's screen, never logged or
emailed. Signed-in users change their own password with `updateUser()`.

The dashboard's Supabase client sets `persistSession: true` and
`autoRefreshToken: true`. The portal's client sets `persistSession: false` —
do not copy one into the other.

---

## Environment variables

Set in the **Netlify dashboard** (Site configuration → Environment variables)
before the first deploy, and in `.env.local` for local development (the
`VITE_` pair only).

| Variable | Where to get it | Read by |
|----------|-----------------|---------|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL | browser (inlined at build) and the admin function |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / publishable key | browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service role key (copy button) | **the admin function only** — tick "Contains secret values" |

The anon key is **public by design**; RLS makes it safe. The service role key
bypasses RLS: it must never be `VITE_`-prefixed, committed, or referenced from
`src/`. Checked at build: the bundle contains no `service_role` string.

`.env` and `.env.*` are gitignored (`.env.example` excepted).

---

## Submit failure

There is no database-side retry. If either write fails the portal stays on the
door, keeps every answer on screen, shows the failure notice, and lets the
supplier submit again — spec §9.5. A company row created by a first-half
success with no submission row is acceptable and self-correcting: the next
successful submission from that company matches the same row.

---

## Reviewing submissions

**In the review dashboard (Tool B)** — that is what it is for. The Supabase
table editor remains available as a fallback; it uses the service role and
bypasses RLS.

A useful starting query:

```sql
select c.legal_name, c.registered_country, c.contact_email,
       s.path, s.door, s.submitted_at, s.answers
from public.submissions s
join public.companies c on c.id = s.company_id
order by s.submitted_at desc;
```

---

## Notes for future sessions

- **Never disable RLS** to unblock a query. Fix the policy or the query.
- **Never add an `anon` select policy to `companies`.** The only read path is
  the dashboard's team-member policy. If something else
  needs company data, add a `SECURITY DEFINER` function that returns only what
  it needs.
- **`authenticated` is not the team.** Any new dashboard policy or function
  gate must check for an active `user_roles` row, never `authenticated` alone
  and never a JWT claim — a supplier who verified an email is `authenticated`.
- `resolve_company` is granted to `authenticated` by the portal (v3.1) so
  verified suppliers can submit. The dashboard never calls it.
- `user_roles` has no write policy by design. Every write goes through the
  admin function, which checks the caller is the active Admin first.
- **Never add an `UPDATE` policy to `submissions`.** `set_submission_status()`
  is the only by-hand write path, by design.
- **Never disable the superseding trigger** to fix a data problem. It runs
  inside the portal's insert; correct the rows instead.
- `answers` is schemaless by design. Question ids come from
  `src/lib/questions.js`; if those ids ever change, historical rows keep the old
  keys. Prefer adding ids over renaming them.
- Linter findings that are intentional (checked 25 September 2026):
  `authenticated_security_definer_function_executable` on `resolve_company`
  (verified suppliers call it) and on `set_submission_status` (team members
  call it; it checks `user_roles` itself). Do not "resolve" either without
  re-reading this file. `auth_leaked_password_protection` (WARN) is a
  one-click Auth setting the builder may switch on — it would make the
  dashboard refuse known-breached passwords at Change password.
- **Free plan pause.** The project pauses after roughly a week idle and takes
  **both** tools down — the portal refuses submissions and dashboard login
  fails. It was found paused at the start of dashboard session 1 and restored
  from the Supabase dashboard; nothing was lost.
