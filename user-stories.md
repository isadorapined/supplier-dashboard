# User Stories — The Corporate Supplier Sustainability Portal 2026

**Written against:** product-spec.md v3.1 · supabase-setup.md as of 11 September 2026
**Date:** 24 September 2026
**Author:** Isa
**Status:** Confirmed
**Population pattern:** Open self-verification (single role) — see access-matrix.md
**Companion file:** access-matrix.md (every story below cites exactly one cell)

> Read by the Project Governor (Iteration Mode) and by Claude Code when it builds the login
> and the access rules together. Each acceptance line is a screen test. Stories whose cell
> is `no` are refusal tests and are as important as the others.

---

## The people

| Role | Named first holder | Layer | Opens |
|---|---|---|---|
| Verified Supplier | Isadora, isadorapined@gmail.com, for the screen test — open to anyone in production | business (the only role — A2) | Verify Your Email, Check Your Inbox, Link No Longer Valid, Path Selection, all four doors, Views 5–7, Confirmation |
| anon | no name — the visitor before verification | pre-auth | Verify Your Email, Check Your Inbox, Link No Longer Valid only |
| platform owner | Isa | outside the app | Supabase and Netlify dashboards |

There is no admin role in this tool. A2 is confirmed by the spec as final for this
iteration: nobody has an in-app admin action. Review happens directly in the Supabase table
editor, outside the app entirely — see access-matrix.md Section 3.

---

## Stories by role and screen

### Verified Supplier — Verify Your Email

- **As a visitor, I enter my email and request a magic link, so that I can prove I control
  it before submitting anything.** `[submissions · create · anon]` (= no, at this point —
  the request itself writes nothing to any table; it only calls Supabase Auth)
  Acceptance: Isadora enters `isadorapined@gmail.com`, submits, and the screen moves to
  Check Your Inbox. A malformed address is rejected client-side with no send attempted
  (criterion 21).

### Verified Supplier — Check Your Inbox

- **As a visitor, I click the link in my inbox and land inside the tool, so that I don't
  have to remember a password.** `[submissions · create · Verified Supplier]` (the click
  itself creates the session that later gates this cell — nothing is written yet)
  Acceptance: Isadora opens the email on the same device and clicks the link; she lands on
  Path Selection (View 2), not the Landing page, with a live session (criterion 23).
- **As a visitor, if nothing arrives, I request a fresh link, so that I'm not stuck.**
  Acceptance: Isadora clicks resend; a new email arrives at the same address (criterion 25).

### Verified Supplier — Link No Longer Valid

- **As a visitor, if my link has expired or was already used, I see a clear message
  instead of a confusing failure, so that I know what to do next.**
  Acceptance: Isadora clicks a link twice; the second attempt shows "Link No Longer Valid"
  with a path back to email entry, not a raw error (criterion 24).

### Verified Supplier — Company & Contact (all four doors)

- **As a Verified Supplier, my contact email is pre-filled and locked to the address I
  verified, so that I can't accidentally (or deliberately) submit under a different
  identity than the one I proved.** `[submissions · create · Verified Supplier]`
  Acceptance: on any of the four doors, `contact_email` shows Isadora's verified address and
  is not editable; every other field (legal name, country, contact name, title) stays free
  text (criterion 26).

### Verified Supplier — any door, submitting

- **As a Verified Supplier, I create exactly one submission tied to my verified email, so
  that The Corporate can trust the identity behind it.** `[submissions · create ·
  Verified Supplier]` (= own)
  Acceptance: Isadora completes a door and submits; the row lands in `submissions` with
  `contact_email = isadorapined@gmail.com` and `verified_user_id` matching her
  `auth.users` row. A direct API insert attempt with a different `contact_email` under her
  session is refused by the database, not just hidden by the UI (criterion 27, 28).
- **As a Verified Supplier, I cannot read back any submission, mine included, so that
  nothing leaks.** `[submissions · read · Verified Supplier]` (= no)
  Acceptance: there is no "my submissions" screen; a direct read attempt from Isadora's
  session returns a permission error, not her own row. The confirmation screen renders from
  in-browser state, unchanged from v3.0.
- **As a Verified Supplier, I cannot edit or delete a submission once made, so that the
  record stays honest.** `[submissions · update · Verified Supplier]` (= no) /
  `[submissions · delete · Verified Supplier]` (= no)
  Acceptance: no edit or delete control exists anywhere in the portal; a direct attempt at
  either is refused by the database.

### anon — before verification

- **As a visitor with no verified session, I cannot submit anything, so that a submission
  is always tied to a real mailbox.** `[submissions · create · anon]` (= no)
  Acceptance: a direct API insert attempt into `submissions` with no session is refused —
  this is the actual fix this spec makes, replacing v3.0's `anon` `check (true)` policy.
- **As a visitor with no verified session, I cannot read or write `companies` either, so
  that supplier contact data never leaks.** `[companies · any · anon]` (= no)
  Acceptance: unchanged from v3.0 — a direct call as `anon` against `companies` returns
  nothing, in every case.

### platform owner (Isa) — outside the app

- **As the platform owner, I review every submission directly in the Supabase table
  editor, so that I don't need a review screen built into the portal.** `[submissions ·
  read · platform owner]` (outside RLS entirely — service role)
  Acceptance: Isa opens the Supabase table editor and sees every row, joined to its company,
  exactly as documented in supabase-setup.md's reviewing-submissions query. Unchanged by
  this spec.

---

## Stories that are refusals (collected)

| # | Who | Tries | Result | Cell |
|---|---|---|---|---|
| 1 | anon (no session) | insert into `submissions` | refused by RLS | `submissions · create · anon` |
| 2 | anon (no session) | select/insert/update/delete `companies` | refused by RLS (no policy) | `companies · any · anon` |
| 3 | Isadora (verified) | insert a `submissions` row with a `contact_email` other than her own | refused by `WITH CHECK` | `submissions · create · Verified Supplier` |
| 4 | Isadora (verified) | select her own `submissions` row back | nothing returned — no read policy exists | `submissions · read · Verified Supplier` |
| 5 | Isadora (verified) | update or delete her own `submissions` row | refused — no policy for either | `submissions · update/delete · Verified Supplier` |
| 6 | anon (no session) | call `resolve_company()` | refused — execute revoked from `anon` | `resolve_company · execute · anon` |
| 7 | anyone, any role | delete a `submissions` or `companies` row through the app | no delete policy anywhere | `any table · delete · any role` |
| 8 | Isadora | click an expired or reused magic link | "Link No Longer Valid" screen, not an error page | screen refusal, criterion 24 |

---

## Later list (not this version)

- `resolve_company()`'s own parameters are not checked against `auth.email()` — an
  authenticated caller could still overwrite an existing company's contact fields with
  arbitrary values by passing a matching legal name. Pre-existing since v3.0 under `anon`;
  unaffected by this iteration. Flag for a future spec if it ever matters.
- No "my submissions" or account screen — explicitly out of scope (spec Section 12); would
  require a read policy and a UI, and isn't wanted.
- No admin role, no withdraw/reinstate/anonymise mechanism — GDPR confirmed not applicable
  for this class/portfolio project; revisit if that ever changes.
