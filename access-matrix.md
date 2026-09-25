# Access Matrix — The Corporate Supplier Sustainability Portal 2026

**Written against:** product-spec.md v3.1 · supabase-setup.md as of 11 September 2026
**Population pattern:** Open self-verification (single role, no named list). Reconstructed short-run pattern was **P1 — public, stays anonymous**; this full run replaces the `anon` write path with an `authenticated` one, but the population stays open — nobody is ever invited or named onto a fixed list, they simply prove an email and become the one role.
**Date:** 24 September 2026
**Author:** Isa
**Status:** Confirmed
**Companion file:** user-stories.md

> The source of truth for who may do what. The Project Governor lifts Section 7 into
> CLAUDE.md. Claude Code builds the login and every line of Section 6 with the mechanism
> that line names, in the same pass. The screen test as the named tester triggers every
> `no` and the one `own` boundary in Section 1. The handover ships this file unchanged.
> Section 6 of product-spec.md points here from v3.1 on.
>
> This tool has no profiles table, no admin role, no lookup tables, no history table and
> no storage buckets. That is not an omission — it is what A2 with one undifferentiated
> role and no in-app admin action actually requires. Each absence is stated below with the
> reason, so nobody reintroduces it by habit.

---

## 1. The matrix

Legend: `yes` = all rows · `own` = rows the role owns (definition in Section 2) · `no` =
refused, in the database, not only in the screen · `—` = not applicable to this table.

Actions are always these seven, in this order: create, read, update, change state, delete,
export, maintain lists.

### companies

| Action | Verified Supplier | anon (no login) |
|---|---|---|
| create | no (only via `resolve_company()`) | no |
| read | no | no |
| update | no (only via `resolve_company()`) | no |
| change state | — (no states) | — |
| delete | no | no |
| export | no | no |
| maintain lists | — (not a lookup table) | — |

No role ever reads or writes `companies` directly. The only route in is `resolve_company()`,
unchanged in behaviour from v3.0 except who may call it (Section 5).

### submissions

| Action | Verified Supplier | anon (no login) |
|---|---|---|
| create | **own** — a row where `contact_email = auth.email()` and `verified_user_id = auth.uid()` | **no** — this is the change this spec makes |
| read | no (no "my submissions" screen exists — Section 12, out of scope) | no |
| update | no | no |
| change state | — (final on insert, no states) | — |
| delete | no | no |
| export | no | no |
| maintain lists | — | — |

A submission is frozen the moment it is inserted. There is no draft, no review, no
withdrawal in this build — unchanged from v3.0, and this spec does not add one.

### profiles — not built

Not needed. There is exactly one role, no admin flag, and no `active`/`inactive` gating.
RLS reads `auth.email()` and `auth.uid()` straight off the session's JWT. A profiles table
would exist only to hold columns this tool has no use for. If a second role or an in-app
admin ever arrives, this section is revisited then, not seeded now.

### lookup tables — none

`companies.legal_name`, `submissions.path`, `submissions.door` are free text or a fixed
check constraint, not dropdown-backed tables. Nothing to maintain here.

### history / audit table — not built

No table has states or corrections to log. `submissions` rows are final on insert and never
change again; `companies` rows are upserted by `resolve_company()`, which already records
`updated_at`. Neither needs a change log for this version.

### storage buckets — none

Unchanged from v3.0: no file is ever stored. Only filename and size reach the database.

---

## 2. Ownership

- **submissions**: a row belongs to the verified session that inserted it. Ownership is
  defined by two columns together, both set at insert and never changed afterward:
  `contact_email = auth.email()` and `verified_user_id = auth.uid()`. Ownership never
  transfers, and there is no screen that reads a row back by its owner — the definition
  exists purely to gate the `create` action.
- **companies**: not owned by anyone. It is internal reference data, matched by
  `lower(btrim(legal_name))`, maintained only by `resolve_company()`.

---

## 3. The people

| Role | Named first holder | Layer | Opens |
|---|---|---|---|
| Verified Supplier | Isadora (isadorapined@gmail.com), for the screen test — open to anyone in production | business (the only role — A2) | Verify Your Email, Check Your Inbox, Link No Longer Valid, Path Selection, all four doors, Views 5–7, Confirmation |
| anon | no name — the public visitor before verification | pre-auth | Verify Your Email, Check Your Inbox, Link No Longer Valid only |
| platform owner | Isa | outside the app | Supabase and Netlify dashboards; reviews submissions directly in the Supabase table editor (service role, bypasses RLS) |

There is no admin role. The spec is explicit that A2 stops here: nobody has an in-app
admin action, and adding one would make this A3. Every action a reviewer normally needs —
reading everything, and any future withdraw/anonymise — happens in the Supabase dashboard
by the platform owner, exactly as it already does under v3.0's PROGRESS.md ("reviewed
directly in the Supabase table editor... no review UI in the portal").

---

## 4. Exceptions (column-level, not built at the access stage)

None. No field needs hiding from Verified Supplier — the role can read nothing back from
`submissions` at all, so there is no partially-visible row to worry about.

**Noted, not a build item this session:** `resolve_company()`'s own parameters
(`p_contact_email`, `p_contact_name`, etc.) are not checked against `auth.email()`. An
authenticated supplier can already call it with a legal name that matches an existing
company and overwrite that company's stored contact fields with any values they choose —
this is unchanged behaviour carried over from v3.0 (it was equally true under `anon`) and
is outside Section 5's stated scope for this iteration, which is only about tying
`submissions.contact_email` to the verified identity. Flagged for a later spec iteration if
it ever matters; not solved here.

---

## 5. Schema delta (what the access stage adds to supabase-setup.md, in one pass with the login)

| Table | Add | Why |
|---|---|---|
| `submissions` | `verified_user_id uuid not null default auth.uid() references auth.users(id)` | a durable, non-spoofable link from the row to the session that created it, independent of the `contact_email` text value |
| — | no `profiles` table | one undifferentiated role, no admin flag — see Section 1 |
| — | no `created_by` / `updated_by` / `status` / audit columns on `submissions` | the row is never revisited or edited after insert; `submitted_at` (already present) is the only timestamp this tool needs, and ownership is carried by `verified_user_id` + `contact_email` instead of the usual `created_by` |

Seed: nothing to seed. There is no named list of accounts to pre-create — the population is
open, and the first real row is the tester's own verified submission.

---

## 6. Policy plan (login and rules together)

| # | Table | Action | Role | Rule in words | Mechanism | Screen test |
|---|---|---|---|---|---|---|
| 1 | `submissions` | create | Verified Supplier | insert allowed only when the new row's `contact_email` equals the caller's `auth.email()` and `verified_user_id` equals `auth.uid()` | RLS policy (INSERT) with `WITH CHECK (contact_email = auth.email() AND verified_user_id = auth.uid())` | Isadora verifies, submits a door with her own email pre-filled — succeeds. A direct API insert with a different `contact_email` under her session is refused. |
| 2 | `submissions` | create | anon | no policy — the current `check (true)` policy for `anon` is dropped | none (default deny; this is the fix) | a direct API insert as `anon`, no session, is refused |
| 3 | `submissions` | read / update / delete | Verified Supplier | no policy on any of these | none | Isadora cannot read her own row back, cannot edit it, cannot delete it — unchanged from v3.0's behaviour under `anon` |
| 4 | `companies` | any action | Verified Supplier | no policy on any action | none | Isadora cannot select, insert, update or delete `companies` directly; only `resolve_company()` can |
| 5 | `resolve_company()` | execute | Verified Supplier (authenticated) | grant execute to `authenticated`; revoke from `anon` | function grant | calling it as `anon` fails; calling it inside an authenticated session succeeds |
| 6 | every table | any | anon (post-verification-gate) | nothing beyond viewing the three pre-auth screens: no table grant | none (default deny) | a logged-out visitor's direct API calls to `companies` or `submissions` all fail |
| 7 | `submissions` | delete | everyone, including platform owner via the app | no policy | none | no delete works from any account through the app; rows are only ever removed by the platform owner directly in the Supabase table editor if ever needed |

Default deny applies to every table: where no line above says yes, the answer is nothing.

**The gate.** Both halves recorded in PROGRESS.md before this stage is deployed.
**Half A (Claude Code):** attempt lines 2, 3, 4, 5 (as `anon`) and the mismatched-email
variant of line 1 through the API directly; paste the refusals into PROGRESS.md under
"Refusal test record." **Half B (Isadora, isadorapined@gmail.com):** verify her own email
end to end, land on Path Selection, complete one door, confirm the row appears in the
Supabase table editor with her `contact_email` and a `verified_user_id` matching her
`auth.users` row.

---

## 7. Hard rules for CLAUDE.md (the Governor lifts these verbatim)

1. The refusal happens in the database, never only in the screen. RLS is enabled on both
   tables and never disabled to make something work. `anon` has no policy and no table
   grant on either table after this build; the only write path for a verified supplier is
   the `submissions` INSERT policy in Section 6, line 1.
2. Not applicable to this tool. There is no `role`, `is_admin` or `active` column anywhere
   in this build — one undifferentiated role, no admin flag — so there is nothing for a
   user to change even if they tried. If a role or admin flag is ever added later, this
   rule applies from that point on.
3. A `submissions` row is frozen for everyone, including the platform owner, from the
   moment it is inserted. There is no update path in the app at all — not "final after a
   transition," but final immediately, by design, unchanged from v3.0.
4. Nothing is deleted through the app. There is no delete policy on either table. The
   platform owner may remove a row directly in the Supabase table editor (service role,
   bypasses RLS) if one is ever genuinely needed to go — GDPR is confirmed not applicable
   for this project, so no anonymisation function is built.
5. `submissions` carries `verified_user_id` (set automatically to `auth.uid()` on insert)
   alongside the existing `contact_email` and `submitted_at`, as its full audit trail. It
   has no `created_by`/`updated_by`/`updated_at`, because it is never updated.

---

## 8. Handover paragraph (for the handover package, plain language)

The Corporate Supplier Sustainability Portal has one kind of user: a Verified Supplier, who
proves they control an email address by clicking a magic link, then submits exactly one
assessment tied to that address. Nobody is invited onto a list — anyone can verify and
submit, which is the intended design (validation, not gatekeeping). There is no admin
inside the app; The Corporate reviews every submission directly in the Supabase table
editor, which bypasses these rules entirely. A submitted row can never be read back, edited
or deleted through the portal itself, by the supplier or by anyone else — it is frozen the
instant it is written, and the database enforces that regardless of what the screen shows.
The Supabase and Netlify accounts are held by Isa; moving them to a company account changes
nothing about how these rules work.
