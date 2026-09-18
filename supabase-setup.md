# Supabase Setup — The Corporate Supplier Sustainability Portal 2026

> **This file is the schema source of truth.** It supersedes the provisional
> schema in CLAUDE.md from the moment it exists. Update it at every save point
> that touches the database — a table, a column, a policy, or a function.

**Last updated:** 11 September 2026 — session 3

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

**Indexes**

- `submissions_pkey` — primary key on `id`
- `submissions_company_id_idx` — on `company_id`
- `submissions_submitted_at_idx` — on `submitted_at desc`

> **No file is ever stored.** `attached_file_name` and `attached_file_size` are
> the only trace of the EcoVadis PDF or the uploaded workbook. Nothing goes to
> Supabase Storage, and the file bytes never leave the browser. Spec §5, §12,
> acceptance criterion 11.

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
| `companies` | *(none — deliberately)* | — | — |
| `submissions` | `anon may insert a submission` | `anon` | `INSERT` with check `true` |

`companies` has RLS on and **no policy at all**, which denies every anon
select, insert, update and delete. Supplier contact details are therefore
unreadable from the browser. The only route in is `resolve_company()` below.

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
| `insert` into `submissions` | succeeds |
| `select` from `submissions` | 0 rows |
| `update` / `delete` on `submissions` | 0 rows affected |

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

---

## Migrations applied

| Name | What it did |
|------|-------------|
| `v3_companies_submissions_schema` | Both tables, constraints, indexes, comments |
| `v3_rls_and_resolve_company` | RLS on both tables, the submissions insert policy, `resolve_company` |
| `v3_restrict_resolve_company_to_anon` | Revoked execute from `authenticated` (least privilege) |

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

Directly in the Supabase table editor, which uses the service role and bypasses
RLS. There is no review UI in the portal and none is planned before v4, since
that would need login.

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
- **Never add a select policy to `companies`.** If something needs company data,
  add a `SECURITY DEFINER` function that returns only what it needs.
- Adding auth (v4) means granting `execute` on `resolve_company` to
  `authenticated` explicitly — it was revoked on purpose.
- `answers` is schemaless by design. Question ids come from
  `src/lib/questions.js`; if those ids ever change, historical rows keep the old
  keys. Prefer adding ids over renaming them.
- The two linter findings above (`rls_enabled_no_policy` on `companies`,
  `anon_security_definer_function_executable` on `resolve_company`) are both
  intentional. Do not "resolve" them without re-reading this file.
