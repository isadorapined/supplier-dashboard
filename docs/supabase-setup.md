# Supabase Setup — The Corporate (portal + review dashboard)

> **This file is the schema source of truth.** It supersedes the provisional
> schema in CLAUDE.md from the moment it exists. Update it at every save point
> that touches the database — a table, a column, a policy, or a function.

**Last updated:** 18 September 2026 — dashboard session 1

> **Two tools, one database.** This project is shared by
> **Tool A — The Corporate Supplier Sustainability Portal 2026** (public,
> no login, created this schema) and **Tool B — The Corporate Supplier Review
> Dashboard 2026** (internal, login-protected, reads both tables and owns the
> review status). Both repos carry a copy of this file. The dashboard's copy
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

---

## RLS

**RLS is enabled on both tables and must never be disabled.** If a query fails,
fix the policy or the query.

> **The spec was wrong about this and was corrected during the build.** v3.0 §6
> originally read "no RLS policies in this version," §14 repeated it, and §2's
> Tier table implied RLS arrives with auth at Tier 3. All three have been
> corrected in `docs/product-spec.md`. RLS is not an authentication feature. The
> anon key ships inside the public JavaScript bundle and the portal URL is
> handed to every Tier 1 supplier, so without RLS any recipient could read,
> alter, or delete every other supplier's submission. RLS is required on any
> table the anon key can reach, at every tier, login or no login.

| Table | Policy | Role | Command |
|-------|--------|------|---------|
| `companies` | *(no anon policy — deliberately)* | `anon` | — |
| `companies` | `authenticated may read companies` | `authenticated` | `SELECT` using `true` |
| `submissions` | `anon may insert a submission` | `anon` | `INSERT` with check **`status = 'new'`** |
| `submissions` | `authenticated may read submissions` | `authenticated` | `SELECT` using `true` |
| `submission_status_changes` | `authenticated may read the status log` | `authenticated` | `SELECT` using `true` |

`companies` still has **no anon policy at all**, which denies every anon
select, insert, update and delete. Supplier contact details remain unreadable
from an anon browser session. The only anon route in is `resolve_company()`.

### Why an `authenticated` select policy on `companies` is not a breach of the portal's rule

The portal's note below says *"never add a select policy to `companies`."*
That rule exists to keep supplier contact details away from the **anon** key,
which ships inside both tools' public JavaScript bundles and is handed to every
supplier with the portal URL. The policy added here grants `SELECT` to the
**`authenticated`** role only. It adds nothing for `anon`, and anon still reads
zero rows from `companies` — verified below.

That is safe only because **signup is disabled at the Supabase Auth level**.
With signup off, `authenticated` means "a user the builder created by hand in
Authentication → Users", which is exactly the small invited team the dashboard
exists for. If signup were ever switched on, anyone holding the public anon key
could create an account and read every supplier's contact details through this
policy. **Signup staying off is what holds this rule up.**

`resolve_company()` remains revoked from `authenticated`, as before — the
portal's old note about granting it when auth arrives is overridden by
dashboard spec v1.1.

**No write policy exists on any table for `authenticated`.** Status changes go
only through `set_submission_status()`, and the log is written only by that
function and the superseding trigger. Never add an `UPDATE` policy to
`submissions`.

Supabase's linter reports this as `rls_enabled_no_policy` (INFO) — that finding
is expected and intentional here, not a gap to close.

Because `submissions` is insert-only, the client cannot read back the row it
just wrote: a `.insert().select()` chain is refused by the policy. The
confirmation screen (View 7) is rendered from in-browser state instead. Do not
"fix" this by adding a select policy.

### Verified behaviour, as the `anon` role

| Attempt | Result |
|---------|--------|
| `select` from `companies` | 0 rows, even with rows present |
| `insert` into `companies` directly | refused — `new row violates row-level security policy` |
| `delete` from `companies` | 0 rows affected |
| `insert` into `submissions` (no `status` sent) | succeeds — arrives as `new` |
| `insert` into `submissions` with `status = 'accepted'` | refused — `new row violates row-level security policy` |
| `insert` into `submissions` with `status = 'superseded'` | refused — same |
| `select` from `submissions` | 0 rows |
| `update` / `delete` on `submissions` | 0 rows affected |
| `select` from `submission_status_changes` | 0 rows |
| `select public.set_submission_status(...)` | refused — `permission denied for function` |

### Verified behaviour, as the `authenticated` role

| Attempt | Result |
|---------|--------|
| `select` from `companies` / `submissions` / `submission_status_changes` | all rows |
| `update public.submissions set status = ...` | 0 rows affected (no update policy) |
| `delete from public.submissions` | 0 rows affected |
| `insert` into `submission_status_changes` | refused — RLS |
| `insert` / `update` on `companies` | refused / 0 rows affected |
| `delete from submission_status_changes` | 0 rows affected |

---

## Functions

### `public.resolve_company(p_legal_name, p_registered_country, p_contact_name, p_contact_title, p_contact_email) → uuid`

`SECURITY DEFINER`, `set search_path = public, pg_temp`. Execute granted to
`anon` only — explicitly revoked from `public` and from `authenticated`, since
this build has no authenticated users.

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

The Supabase linter reports `anon_security_definer_function_executable` (WARN)
for this function. That is intentional — anon calling it is the entire design.

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

*Added by the dashboard.* `SECURITY DEFINER`, `set search_path = public, pg_temp`.
Execute granted to **`authenticated` only**, revoked from `public` and `anon`.

The **only** way a status changes by hand. It refuses when:

| Condition | SQLSTATE | Message |
|-----------|----------|---------|
| `auth.uid()` is null | `DL401` | `Not signed in.` |
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

| Detail | Value |
|--------|-------|
| Method | Email and password |
| Signup | **Invite-only.** "Allow new users to sign up" must be **OFF** in Authentication → Providers → Email |
| Users | Created by the builder in Authentication → Users → Add user |
| In-app password reset | None — out of scope. The builder resets passwords in the Supabase dashboard |

> **Signup being off is a security control, not a preference.** The anon key is
> public. With signup on, anyone holding it could create an account, become
> `authenticated`, and read every supplier's contact details and submissions
> through the policies above. Confirm it is off before every deploy.

The dashboard's Supabase client sets `persistSession: true` and
`autoRefreshToken: true`. The portal's client sets `persistSession: false` —
do not copy one into the other.

---

## Environment variables

Set in the **Netlify dashboard** (Site configuration → Environment variables)
before the first deploy, and in `.env.local` for local development. Vite inlines
them into the client bundle at build time.

| Variable | Where to get it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / publishable key |

The anon key is **public by design** — it ships inside the JavaScript bundle
and anyone can read it. It is safe only because RLS is on. The service role key
is not used by this build and must never appear in a `VITE_` variable, in any
committed file, or anywhere in the frontend.

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
- **Never add an `anon` select policy to `companies`.** The `authenticated`
  select policy added for the dashboard is the one deliberate exception, and it
  holds only while signup is off — see the RLS section above. If something else
  needs company data, add a `SECURITY DEFINER` function that returns only what
  it needs.
- `resolve_company` stays **revoked from `authenticated`**. The portal's old
  note about granting it when auth arrives is overridden by dashboard spec
  v1.1 — the dashboard never resolves companies, it only reads them.
- **Never add an `UPDATE` policy to `submissions`.** `set_submission_status()`
  is the only by-hand write path, by design.
- **Never disable the superseding trigger** to fix a data problem. It runs
  inside the portal's insert; correct the rows instead.
- `answers` is schemaless by design. Question ids come from
  `src/lib/questions.js`; if those ids ever change, historical rows keep the old
  keys. Prefer adding ids over renaming them.
- Linter findings that are intentional: `anon_security_definer_function_executable`
  on `resolve_company` and on `set_submission_status`. The old
  `rls_enabled_no_policy` finding on `companies` has gone now that the
  authenticated select policy exists. Do not "resolve" the remaining two
  without re-reading this file.
- **Free plan pause.** The project pauses after roughly a week idle and takes
  **both** tools down — the portal refuses submissions and dashboard login
  fails. It was found paused at the start of dashboard session 1 and restored
  from the Supabase dashboard; nothing was lost.
