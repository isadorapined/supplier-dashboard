# Product Spec — The Corporate Supplier Sustainability Portal 2026

**Version:** 3.1
**Date:** 24 September 2026
**Author:** Isa
**Status:** Confirmed

> **This is an iteration spec, not a full rewrite.** It documents ONE change against the existing v3.0 build: adding email verification via a Supabase Auth magic link in front of the existing submission flow. Every section below that is not touched by this change says so explicitly and points back to `docs/product-spec.md` (v3.0) and `docs/product-spec-v2.1.md`, which remain authoritative for everything this document does not override. Do not treat this file as replacing them — it sits on top.

---

## Section 1 — Tool Summary

**Tool name:** The Corporate Supplier Sustainability Portal 2026

**What it does:** A public, no-login-required (until now) single-page portal where Tier 1 supplier contacts complete The Corporate's ESRS-aligned 2026 sustainability assessment and submit it, persisted to Supabase. **This version adds:** the supplier must first prove they own a real, reachable email address via a Supabase Auth magic link before they can proceed into the form.

**Who uses it:** Tier 1 supplier contacts at The Corporate, reached by a direct URL with no invitation or account creation by an admin.

**Why this change exists:** Today anyone with the link can submit with zero identity check — a random or fake email can be typed into the Company & Contact step and nothing verifies it. The purpose is validation, not gatekeeping: The Corporate is not trying to restrict who may submit, only to be sure a submission is tied to a mailbox the sender actually controls.

**Build status:** Iteration — v3.0 is live and persisting submissions to Supabase (Tier 2: D3+A1). This build adds email verification, which promotes the tool to Tier 3 (D3+A2). Everything else about the tool — the two paths, the four doors, the 28 S2–S7 questions, the parser, the brand, the confirmation screen, the redirect to EcoVadis or the internal questionnaire — is unchanged.

---

## Section 2 — Classification

### Data Model

**Decision:** D3 (unchanged from v3.0)

**Reason:** Unchanged — submissions must persist and be reviewable by The Corporate after the fact.

### Access Model

**Decision:** A2 — **changed from A1.**

| Label | This tool? |
|---|---|
| A1 — Public | No — was Yes under v3.0; superseded by this spec |
| A2 — Authentication | **Yes.** Every supplier verifies their email before submitting. All verified suppliers have identical rights — nobody has an in-app admin action, so this stays A2, not A3. |
| A3 — Authorization | No |

**Reason:** The tool needs to know a submission came from a real, reachable mailbox. It does not need to know *which* supplier in any privileged sense, and it does not restrict who may verify — anyone can. That is an authentication requirement (prove you own this inbox), not an authorization requirement (different people see different things).

**Promotion rule applied:** A2 confirmed → Tier moves from D3+A1 (Tier 2) to D3+A2 (Tier 3). Plain language: the tool now has a "prove you own this email" gate in front of the form. It does not mean roles or an admin screen — that would be A3, and nothing here is A3.

### If Access Model is A2 — both questions

**Auth reason:** Identity and continuity — verified email matters. (Not "controlled access": anyone may still verify and submit. Not "ongoing relationship": this is one-time verification per submission, not a returning-user account — confirmed explicitly by the builder, who asked for magic link specifically over email+password for this reason.)

**Signup model:** Open — anyone can verify an email and submit. There is no invite list and no admin-created account.

### Tier

**Tier:** 3 (D3+A2) — **changed from Tier 2.**

### Standalone or Stack

**This tool is:** Standalone — unchanged. Same existing Supabase project (`smnrfopzzzhazkehcqqn`, "The Corporate"), no new project.

---

## Section 3 — Arms

No arms change in this iteration. Note for Claude Code: **the magic link email is not an Email Arm.** It is sent by Supabase Auth's own mechanism (configured in Section 6 below), not by a Resend-triggered Netlify or Edge Function. Do not build a custom Email Arm for it. The Email Arm, Export Arm, AI API Arm and Scheduled Automation Arm all remain **Not Active**, as in v3.0.

---

## Section 4 — Stack and Deployment

Unchanged except the Tier 3 stack line now applies: **Netlify + Supabase (auth + RLS)** rather than "no auth." Same existing Supabase project, same Netlify site. No new environment variables are required for this change — Supabase Auth's magic link works with the existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` pair already in place.

**Supabase plan:** Free — unchanged. Explicitly confirmed by the builder that this is testing-scale traffic for now, so Supabase's own built-in auth mailer (low rate limit, not meant for real production volume) is acceptable. **This is a stated limitation, not an oversight** — see Section 6 and Known Issues in PROGRESS.md.

---

## Section 5 — Data Architecture

No new tables. Two things the Access Architect's full run must resolve when it writes the real RLS policy for `submissions`:

1. **The `submissions` INSERT policy changes role.** Today it is `anon` with `check (true)` — this is the actual open-door problem this session closes. It must become an `authenticated`-role policy: only a session with a verified email may insert.
2. **The verified identity must be provably tied to the row**, not just to the UI. Locking the `contact_email` field in the browser (Section 8) stops an honest supplier from typing a different address, but it does not stop a direct API call from posting a mismatched `contact_email` under a verified session. The Access Architect's full run should decide the mechanism — e.g. a `SECURITY DEFINER` function analogous to `resolve_company()` that reads `auth.email()` server-side rather than trusting a client-supplied value, or a trigger that overwrites `contact_email` with `auth.email()` on insert. **Recorded here as a requirement, not solved here** — this is exactly the kind of decision the Access Architect and Claude Code, not the Tool Architect, should make against the real schema.

**Main record and its states:** unchanged — one row = one submission, no states, submissions are final on insert (no draft/review workflow inside the portal).

**Login-ready columns:** Since a submitted row is never revisited or edited by the supplier, the standard `created_by` / `updated_by` / `status` audit set is more than this tool needs. What it does need is proof of verification on the row itself — at minimum the verified email is already captured via the locked `contact_email` field (point 2 above ties it properly); whether a separate `auth_user_id` column is also worth adding is left to the Access Architect's full run.

**File storage:** unchanged — none.

---

## Section 6 — Access and Permissions

**Auth configuration:**

| Detail | Answer |
|---|---|
| Login, as built | **Magic link (passwordless) — not the template's default email+password.** Supabase Auth: "Enable sign-ups" **ON** (open signup is the whole point), email OTP / magic link flow enabled, **Confirm email** behaviour handled by the magic link itself. **Deviation from the standard build method, and why:** the template's default (email+password, admin-managed, sign-ups off) assumes an admin invites a small known list of people — that does not fit an open, public, unknown-supplier context at all. Magic link is what the framework itself recommends for exactly this case: external users who must prove their email, open signup, no passwords to manage. |
| Sender | **Supabase's own built-in auth mailer — not a Resend-verified domain.** Explicitly confirmed by the builder: this is testing-scale traffic only for now, so the low rate limit is acceptable. This is the tool's known ceiling, not a gap — flagged in PROGRESS.md's Known Issues so a future session doesn't mistake failed sends for a bug. |
| Login, upgrade path | Same magic link mechanism, moved onto a Resend-verified sending domain once real supplier volume needs it (~$10/year, one-time domain setup). Nothing about the flow or the rules changes when this happens — only the sender. |
| No Change Password screen | Not applicable — there are no passwords. This removes that entire piece of the standard Tier 3 build. |
| Named first holders | Not applicable — open public signup, no admin-invited individual. The population pattern for the Access Architect's short/full run is: **open self-verification** — anyone may become a verified session by proving an email, with no fixed list and no roles beyond the one. |
| Roles | One: **Verified Supplier.** Sees and does exactly what an anonymous submitter could under v3.0 — nothing is restricted further. The only change is that the session is now tied to a proven mailbox. |
| When it is built | Together with the updated row rules, per the Access Architect's full run — not ahead of it. |

**Privacy note:** Supabase Auth now stores a verified email per session. This is personal data, and because this is an **open-signup** tool it is what triggers Section 7's scope rule below — flagged explicitly to the builder, who confirmed the "not applicable" GDPR outcome anyway (see Section 7).

**Roles and access:**

| Role | What they broadly see and do |
|---|---|
| Verified Supplier | Same as v3.0's anonymous submitter: chooses a path and door, completes the Company & Contact step (now pre-filled and locked to their verified email), completes the assessment, submits. Cannot see or affect any other supplier's data. |

The row-level rule itself (the `submissions` INSERT policy moving from `anon` to `authenticated`, and the mechanism tying `contact_email` to the verified identity from Section 5) lives in `access-matrix.md`, written by the Access Architect's **full run** — triggered here because a real login now exists, not just the short run v3.0 already had when D3 was first set.

---

## Section 7 — GDPR

**GDPR outcome:** **Not applicable — confirmed by the builder as a class/portfolio project.**

**Flagged and reconfirmed:** the framework's own scope rule says an open-signup tool with login identities normally *does* trigger this section (login emails are personal data, and open signup doesn't get the invite-only exemption that would otherwise cover them). This was raised explicitly with the builder before finalizing this spec. The builder reconfirmed "not applicable, class/portfolio project" with that rule in view. Recorded here as a conscious, informed override rather than an unexamined "no."

---

## Section 8 — Screen and UI Structure

Only new or changed views are described here. Every other view (Landing, Path Selection, Doors 3a/3b/5/6's non-identity content, Views 5–7, Confirmation) is unchanged from v3.0 — see `docs/product-spec.md`.

### NEW — Verify Your Email

- **Purpose:** The first thing a supplier does, before anything else — prove they own a real inbox.
- **What is visible:** A single email input field, a submit button, the same transparency-notice styling used elsewhere in the tool.
- **User actions:** Enter an email address, submit.
- **What happens next:** A Supabase Auth magic link is sent to that address. The screen moves to the "Check Your Inbox" state below. Sits in front of the existing Landing/Path Selection screens — a supplier reaches this before choosing EcoVadis or the full assessment.

### NEW — Check Your Inbox

- **Purpose:** Tell the supplier a link was sent and what to do with it.
- **What is visible:** Confirmation that an email was sent to the address just entered, an instruction to open it **on the same device** (cross-device handling is explicitly not built this session — confirmed acceptable by the builder; a line of copy is enough), and a resend action.
- **User actions:** Click the magic link in their inbox. Or, if nothing arrives, use the **resend** action, which sends a fresh link to the same address.
- **What happens next:** Clicking a valid, unused link authenticates the session and drops the supplier directly into the existing Path Selection screen (View 2) — not back to the Landing page. Clicking an expired or already-used link shows the "Link No Longer Valid" state below instead.

### NEW — Link No Longer Valid

- **Purpose:** Handle an expired or reused magic link without a confusing failure.
- **What is visible:** A plain message that the link has expired or was already used, and an instruction to go back and request a new one.
- **User actions:** Return to "Verify Your Email" and start again.
- **What happens next:** Standard email-entry flow resumes from the top.

### CHANGED — Company & Contact step (all four doors)

- **What changed:** The `contact_email` field is now **pre-filled and read-only**, populated from the verified session's email rather than typed in freely. Legal name, registered country, contact name and contact title remain free text, unchanged. This is what ties a stored submission to the mailbox that was actually checked, per the builder's explicit decision.
- Everything else about this step (five fields, validation, gating before door-specific content) is unchanged from v3.0.

---

## Section 9 — Logic and Calculations

Not applicable to this change — unchanged from v3.0.

---

## Section 10 — Brand and Visual Direction

Unchanged. The three new screens (Verify Your Email, Check Your Inbox, Link No Longer Valid) follow the existing data-leaf-brand skill and tokens — same palette, same type, same voice (analytical, no exclamation points, no emoji).

---

## Section 11 — API and Credentials

No new credentials required for this session. Supabase Auth's magic link works off the existing Supabase publishable/anon key already configured. **Not needed yet, recorded for the upgrade path:** a Resend account and a verified sending domain, once traffic moves beyond testing scale — this is a pre-build task for whichever future session makes that switch, not this one.

---

## Section 12 — Out of Scope — This Iteration

| Deferred feature | Reason it is deferred |
|---|---|
| Cross-device magic link handling (started on one device, opened on another) | Confirmed acceptable by the builder — suppliers will be told to open the link on the device they started on |
| Custom sending domain / Resend integration | Testing-scale traffic only for now; Supabase's built-in mailer is sufficient; this is the documented upgrade path |
| Password-based login of any kind | Explicitly not wanted — one-time verification, not a returning-user account model |
| Change Password screen | Not applicable — there are no passwords |
| Any account settings, profile, or "my submissions" screen | Not requested; a verified session exists only to gate one submission, not to give suppliers an account to manage |
| Persistent sessions across return visits | Each submission attempt verifies fresh; this is not a login suppliers are expected to reuse over time |
| Restricting who may verify or submit | Explicitly out of scope — this is validation, not gatekeeping; open signup is the whole design |

---

## Section 13 — Acceptance Criteria

Existing v3.0 criteria remain in force and unchanged. New criteria for this iteration:

| # | What to verify | Expected result | Done? |
|---|---|---|---|
| 21 | Email entry validates format before sending | Malformed addresses are rejected client-side with a plain message; no send attempted | [ ] |
| 22 | Magic link email sends on valid submission | Supplier receives an email with a working link within a reasonable time | [ ] |
| 23 | Clicking a valid, unused link authenticates | Supplier lands on Path Selection (View 2), not the Landing page, with a live session | [ ] |
| 24 | Clicking an expired or already-used link | "Link No Longer Valid" screen shown, with a path back to email entry | [ ] |
| 25 | Resend action works | A fresh link is sent to the same address; the prior link becomes invalid or remains subject to normal expiry | [ ] |
| 26 | Company & Contact email field is locked | `contact_email` is pre-filled from the verified session and not editable, on all four doors | [ ] |
| 27 | Unauthenticated submission is refused at the database | A direct `submissions` insert attempt with no verified session is rejected by RLS, not just hidden by the UI | [ ] |
| 28 | Submitted row is traceable to the verifying identity | Given a `submissions` row, The Corporate can confirm the `contact_email` matches a session that actually verified that address (mechanism per Section 5, point 2) | [ ] |

---

## Section 14 — Build Path

**This tool's tier:** 3 (D3+A2) — up from Tier 2.

### Pre-build steps for this iteration

- [x] Tool Architect interview complete, this spec confirmed by the builder
- [ ] **Access Architect — FULL RUN**, not the short run. `docs/supabase-setup.md` already exists and someone is now going to log in (verify), which is exactly what triggers the full run. It extends the existing matrix with: the open self-verification population pattern, the `submissions` INSERT policy moving from `anon` to `authenticated`, and the mechanism tying `contact_email` to the verified session (Section 5, point 2).
- [ ] Project Governor, **Iteration Mode** — reads this spec plus the updated `access-matrix.md`, updates `CLAUDE.md` and `PROGRESS.md` in place (history preserved, not reset)
- [ ] This file (`product-spec-v3.1.md`) uploaded to the existing GitHub repo root alongside the updated `access-matrix.md` / `user-stories.md`
- [ ] No new Netlify or Supabase credentials to add by hand for this session

### Build session — collapsed Tier 3 stages

This iteration does not add a new screen that shows other people's records, so the usual Stage 2 ("second screen on fixture data") does not apply here — there is no reviewer/admin screen being introduced. This session goes straight from the existing database (already built, Stage 1 equivalent) into:

**Stage 3 — the door and the updated row rule, together**
- [ ] Claude Code, in one build: configures Supabase Auth for magic link (sign-ups on, email OTP/magic link enabled, no password flow), builds the three new screens (Verify Your Email, Check Your Inbox, Link No Longer Valid), updates the Company & Contact component so `contact_email` is sourced from the verified session and read-only, updates the `submissions` RLS policy from `anon` to `authenticated` per the Access Architect's matrix, and implements the mechanism tying `contact_email` to `auth.email()` (Section 5, point 2)
- [ ] **Gate, before deploying:** attempt a direct `submissions` insert as `anon` (must be refused) and as an authenticated session with a mismatched `contact_email` (must be refused or corrected server-side, per whichever mechanism was chosen) — paste results into `PROGRESS.md`
- [ ] Test the full flow locally: verify → land on Path Selection → complete a door → confirm the row lands correctly
- [ ] Push to main → Netlify auto-deploys
- [ ] Update `docs/supabase-setup.md` with the new RLS policy and any new function, in the same save point (the database was touched)

---

## Section 15 — Open Questions

None blocking. All decisions in this document were confirmed by the builder during the interview.

---

## Section 16 — Tool Version History

> Earlier rows are reconstructed from `CLAUDE.md`, `PROGRESS.md` and `docs/supabase-setup.md` context rather than copied from the original `docs/product-spec.md`, which was not available when this iteration spec was written. Verify against that file if precision on the earlier entries matters.

| Version | Date | What changed in the tool |
|---|---|---|
| v1.0 / v2.1 | (prior to this session) | Initial build and subsequent visual/structural revision — Tier 1/2 groundwork; v2.1 remains binding for View 1 and Section 10 per v3.0's own reference |
| v3.0 | September 2026 (session 3–4) | Added Supabase persistence: `companies` and `submissions` tables, RLS, `resolve_company()`. Promoted Tier 1/2 → Tier 2 (D3+A1) |
| **v3.1** | **24 September 2026** | **This spec.** Added email verification via Supabase Auth magic link ahead of the existing flow. Promoted Tier 2 (D3+A1) → **Tier 3 (D3+A2)**. `contact_email` on the Company & Contact step is now locked to the verified session. `submissions` INSERT policy to move from `anon` to `authenticated` per the Access Architect's full run. |

---

*This spec is written for Claude Code. Combined with `docs/product-spec.md` (v3.0) and `docs/product-spec-v2.1.md`, it assumes zero prior context beyond those two files.*
