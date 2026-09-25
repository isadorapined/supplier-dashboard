# Access Matrix — The Corporate Supplier Review Dashboard 2026

**Written against:** product-spec.md v2.0 · supabase-setup.md as of 18 September 2026 (pre-`user_roles`)
**Population pattern:** P1 — public, stays anonymous
**Date:** 25 September 2026
**Author:** Isa
**Status:** Confirmed
**Companion file:** user-stories.md

> The source of truth for who may do what. The Project Governor lifts Section 7 into CLAUDE.md. Claude Code builds `user_roles`, the Admin capability, and the tightened `set_submission_status()` with the mechanism each line here names, in one pass with the login work already in place. The screen test as each named person triggers every `no` and every `own` in Section 1. The handover ships this file unchanged. product-spec.md Section 6 points here and holds no separate grid of its own beyond its own RLS table (reconciled below).
>
> Every cell names a real table and one of the seven actions. A screen or route is never a cell; screen refusals live in user-stories.md. Export never exceeds read (the Export Arm is inactive on this tool, so export is `no` everywhere).

---

## 1. The matrix

Legend: `yes` = all rows · `own` = rows the role owns (Section 2) · `no` = refused, in the database, not only in the screen · `—` = not applicable to this table · `via Function` = enforced by the Netlify admin function using the service role key, not by RLS.

Actions are always these seven, in this order: create, read, update, change state, delete, export, maintain lists.

### companies *(portal-owned; the dashboard never writes to it)*

| Action | Reviewer (EHS/ESG) | Procurement | Admin | anon |
|---|---|---|---|---|
| create | no | no | no | no *(company rows are created only by the portal's `resolve_company()`, outside this tool's scope)* |
| read | yes | yes | yes | no |
| update | no | no | no | no |
| change state | — | — | — | — |
| delete | no | no | no | no |
| export | no | no | no | no |
| maintain lists | — | — | — | — |

### submissions

| Action | Reviewer (EHS/ESG, active) | Procurement | Admin | anon |
|---|---|---|---|---|
| create | no | no | no | yes — through the existing `anon may insert a submission` policy (`status = 'new'`), built by Tool A, unchanged and out of scope here |
| read | yes | yes | yes | no |
| update (direct) | no | no | no | no |
| change state → `accepted` / `needs_review` | own function call — refused if role not in (`ehs`,`esg`) or `is_active = false` | no | same as Reviewer, through their underlying role | no |
| change state → `superseded` | no (automatic only) | no | no (automatic only) | no *(the trigger runs inside the anon insert)* |
| delete | no | no | no | no |
| export | no | no | no | no |

### submission_status_changes

| Action | Reviewer | Procurement | Admin | anon |
|---|---|---|---|---|
| create | no (automatic — trigger or `set_submission_status()` only) | — | no (automatic) | no (automatic, on supersede) |
| read | yes (includes the review comment) | yes (includes the review comment) | yes | no |
| update | no | no | no | no |
| delete | no | no | no | no |

### user_roles *(new)*

| Action | Reviewer (non-admin) | Procurement (non-admin) | Admin | anon |
|---|---|---|---|---|
| create (invite) | no | no | yes — via Function only | no |
| read (own row) | own | own | own *(same RLS policy as everyone — see below for the roster)* | no |
| read (full roster) | no | no | yes — via Function only, never through RLS | no |
| update (role, is_admin, is_active) | no | no | yes on others, via Function; no on self-lockout even via Function | no |
| delete | no | no | no *(deactivate only, never delete)* | no |

Withdraw/reinstate/anonymise do not apply to this tool: submissions have no user-triggered "withdraw," and `user_roles` has no GDPR erasure concept in scope (Section 7 of the spec: not applicable).

---

## 2. Ownership

- **companies**: no ownership concept. Every authenticated login (Reviewer, Procurement, Admin) reads every row equally.
- **submissions**: no ownership concept. Every authenticated login reads every row equally. Hand-written status changes are gated on the caller's `user_roles.role ∈ (ehs, esg)` and `is_active = true` inside `set_submission_status()` — never on row ownership.
- **submission_status_changes**: no ownership concept; every authenticated login reads every row; written only by the trigger and the function.
- **user_roles**: a row belongs to itself — `auth_user_id = auth.uid()`. Through RLS, a user reads only their own row. The full roster is never exposed to any role through RLS, Admin included; it is exposed only through the Netlify Function, after the Function verifies the caller currently holds `is_admin = true`.

---

## 3. The people

| Role | Named first holder | Layer | Screens |
|---|---|---|---|
| Reviewer *(schema labels: `ehs`, `esg` — same permissions)* | Isabela — isabela@gmail.com · Isa — isadorapined@gmail.com | business | Dashboard |
| Procurement | isabel — isabel@gmail.com | business | Dashboard (view-only) |
| Admin *(capability on `user_roles.is_admin`, layered on one active Reviewer)* | Isa | app admin | Admin Panel, plus Dashboard |
| platform owner | Isa, personally | outside the app | Supabase, Netlify |

Admin's real action set on this tool (adapted from the skill's generic four, since there are no lookup tables and no record-withdraw concept here): invite · deactivate/reactivate · reset password · reassign role · move Admin · read the full roster. Admin is not exempt from Section 7 rule 3 (self-lockout is refused even for the current Admin).

This is a stack: the portal (Tool A) has the `anon` column and no other role. The dashboard (Tool B) has Reviewer, Procurement, and Admin. One matrix, one database.

---

## 4. Exceptions (column-level, not built at the access stage)

None. Procurement reads exactly the same fields on every row it can read (including the review comment) as Reviewer and Admin — there is no column hidden from a role that can otherwise read the row.

File storage: no — unchanged from v1.1.

---

## 5. Schema delta (what this iteration adds to supabase-setup.md, in one pass)

| Table | Add | Why |
|---|---|---|
| `user_roles` *(new)* | `id` uuid pk default `gen_random_uuid()`; `auth_user_id` uuid unique, FK → `auth.users.id`, set by the Function at invite time; `email` text; `role` text, check-constrained to `ehs` \| `esg` \| `procurement`; `is_admin` boolean default `false`; `is_active` boolean default `true`; `created_at` timestamptz default `now()`; `updated_at` timestamptz | who has which role, and whether they're active or the current Admin |
| `user_roles` — constraint | a partial unique index on `is_admin` where `is_admin = true`, so at most one row can hold Admin; the Function additionally refuses unsetting the only Admin without setting a new one in the same transaction | the single-admin invariant, enforced in the database, not just the UI |
| `set_submission_status()` — updated | adds a refusal unless the caller's `user_roles` row has `role ∈ (ehs, esg)` **and** `is_active = true`, on top of its existing v1.1 refusals | Procurement and any deactivated account are refused at the function, not only hidden in the UI |

No separate `profiles` table is introduced — this project keys directly off `auth.users` via `user_roles.auth_user_id`, matching how the dashboard's login has worked since v1.1. The tables win.

Seed: Isa's existing v1.1 login (if it already exists in Supabase Auth) gets a `user_roles` row with `role = 'esg'`, `is_admin = true`, `is_active = true`; Isabela and isabel are invited fresh through the Admin Panel once it exists (open question in spec Section 15 — resolvable during build).

---

## 6. Policy plan (one line per `own` and per `no`)

| # | Table | Action | Role | Rule in words | Mechanism | Screen test |
|---|---|---|---|---|---|---|
| 1 | companies | read | Reviewer, Procurement, Admin | all rows | policy (SELECT) — unchanged from v1.1 | any authenticated login sees every company |
| 2 | submissions | read | Reviewer, Procurement, Admin | all rows | policy (SELECT) — unchanged from v1.1 | any authenticated login sees every submission |
| 3 | submission_status_changes | read | Reviewer, Procurement, Admin | all rows, including the review comment | policy (SELECT) — unchanged from v1.1 | any authenticated login sees every log row |
| 4 | submissions | change state → `accepted`/`needs_review` | Reviewer (role ∈ ehs,esg, active) | via `set_submission_status()`; refuses if role not in (ehs,esg) or inactive, plus the existing v1.1 refusals | function | Isabela/Isa succeed; isabel is refused regardless of parameters |
| 5 | submissions | change state → `superseded` | nobody, by hand | automatic AFTER INSERT trigger, same route only | trigger — unchanged from v1.1 | no role can set this directly; a same-route resubmission flips it automatically |
| 6 | companies, submissions, submission_status_changes | create/update/delete (direct) | every authenticated role | no policy exists beyond what's listed above | none (default deny) | no authenticated write succeeds outside `set_submission_status()` |
| 7 | user_roles | read | any authenticated user | own row only (`auth_user_id = auth.uid()`) | policy (SELECT) | Isa sees her own row; a query for Isabela's row, run as Isa, returns nothing |
| 8 | user_roles | create/update/delete (direct) | any authenticated user | no policy exists — default deny | none | a direct insert/update/delete from any authenticated session is refused |
| 9 | user_roles | create (invite), update (role/is_admin/is_active) | Admin only | the Function verifies server-side that the caller is authenticated and currently holds `is_admin = true` before touching the service role key; each action completes fully or leaves the prior state untouched | function (Netlify, service role key) | Isa invites/deactivates/reassigns through the Admin Panel; a non-admin's direct call to the Function is refused |
| 10 | user_roles | single-admin invariant | database | at most one `is_admin = true` row at any time; unsetting the only Admin without setting a new one in the same statement is refused | constraint (partial unique index) + Function check | removing Isa's Admin without naming a successor is refused, in the UI and via a direct Function call |
| 11 | every table | any | anon | nothing, except `submissions · create`, which is the existing anon INSERT policy from Tool A's build (`status = 'new'`), predating this tool and out of scope to change | policy (existing, unchanged) / none (default deny elsewhere) | a logged-out visitor to the dashboard reaches nothing; the portal's public form still submits |
| 12 | Admin Panel (screen) | open | Reviewer, Procurement (non-admin) | no route reaches it; the roster data behind it comes only from the Function, gated on `is_admin` | screen (frontend route guard) + no data path exists for non-admins | isabel or Isabela visiting the Admin Panel URL directly is redirected to the Dashboard |
| 13 | any account | change own password | the signed-in user only | the Change password path, for the signed-in user only | Supabase Auth (`updateUser`) | each person changes their own password; nobody changes another's outside the Admin's reset action |

Default deny applies to every table: where no line above says `yes` or names a function, the answer is nothing. Every check against `user_roles` also checks `is_active`, so a deactivated account is refused even while an old session lives (acceptance criterion 26).

**The gate.** The refusal test has two halves, both recorded in PROGRESS.md before this stage is deployed. **Half A (Claude Code, via the API):** every `no` cell above and the `own` boundary on `user_roles · read`, attempted as each named person's session and as a logged-out visitor, results pasted into PROGRESS.md under "Refusal test record." **Half B (the named people, on the screens):** acceptance criteria 23–34 in product-spec.md v2.0 map directly onto rows 1–13 above — run them as Isabela, Isa, and isabel. Any later change to a rule re-runs both halves before the push.

---

## 7. Hard rules for CLAUDE.md (the Governor lifts these verbatim)

1. The refusal happens in the database, or in the Netlify Function that holds the service role key and checks every request itself; never only in the screen. RLS is enabled on every table and never disabled. `anon` has no policy or grant beyond the one existing `submissions` INSERT policy it already holds (Tool A's, unchanged). A function holding the service role key bypasses RLS, so for its path the function is the rule.
2. Nobody changes their own `role`, `is_admin`, or `is_active` through the app — refused at the database even via a direct call to the Function. Another user's `role`, `is_admin`, or `is_active` is changed only by the current Admin, only through the Netlify Function using the service role key — never by a direct RLS policy from the browser, and never trusted to the UI alone. *(This adapts the skill's generic "only the platform owner in the Supabase dashboard" default: this tool deliberately delegates that to an in-app Admin capability, enforced server-side.)*
3. A submission that is `superseded` is frozen for everyone, Admin included. The only way forward is a new submission on the same route, which supersedes it automatically via the trigger. There is no free edit and no by-hand override.
4. Nothing is deleted through the app. No `DELETE` policy exists on `companies`, `submissions`, `submission_status_changes`, or `user_roles`. Deactivation, through the Function, is the only "removal" a team member ever undergoes.
5. `submissions` and `submission_status_changes` already carry their audit trail from v1.1 (`submitted_at`/`changed_at`, `changed_by`/`changed_by_email`). `user_roles` carries `created_at`/`updated_at`. `submission_status_changes` remains the sole history table, filled only by the trigger and `set_submission_status()`.

---

## 8. Handover paragraph (plain language)

The Corporate Supplier Review Dashboard has three kinds of login. Reviewers (Isabela — EHS, Isa — ESG) see every submission and set its review status and comment. Procurement (isabel) sees exactly the same information but can never change it — enforced both in the screen and, independently, inside the database function itself, so the rule holds even if someone tries to call it directly. Exactly one Reviewer holds the Admin capability at a time — today, Isa — and manages the other two (invite, deactivate, reset password, reassign role) through an in-app Admin Panel that calls a server-side function holding Supabase's service role key, a key that never reaches the browser. Nobody, Admin included, can lock the team out of Admin: dropping it or deactivating yourself requires naming a successor in the same action. Nothing is ever deleted. The rules are enforced in the database and the server function themselves, so they hold regardless of which screen reaches the data. Isa holds the Supabase and Netlify accounts personally.
