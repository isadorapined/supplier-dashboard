# The Corporate Supplier Sustainability Portal 2026

## Identity
A public single-page portal where Tier 1 supplier contacts verify a real email address via a Supabase Auth magic link, then complete and submit The Corporate's ESRS-aligned 2026 sustainability assessment, persisted to Supabase and linked to a reusable company record.
Tier: 3 — public assessment form gated by email verification (magic link); one undifferentiated role, no in-app admin (D3+A2)
Spec version governed: v3.1 — the version of docs/product-spec.md these rules were derived from. docs/product-spec-v2.1.md and the v3.0 spec remain authoritative for everything v3.1 does not override.
Position: Standalone — its own Supabase project, not part of a stack.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line above, STOP and tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it." Do not build against a stale CLAUDE.md.
3. Read PROGRESS.md in the project root — it is the current state of this build. If it is missing, recreate it with the structure at the end of this section, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content: repeat the notes back to the builder, treat them as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work (already completed for this project: docs/ created, data-leaf-brand skill installed at .claude/skills/data-leaf-brand/).

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table, policy, or auth change), update docs/supabase-setup.md in the same save point, and make sure the change's migration file is in supabase/migrations/ and committed with it.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one — an ending session is a save point.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL / Stage / Supabase project), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Refusal test record, Build decisions, Known issues, Backlog, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · shadcn/ui · Netlify · Supabase (database + Auth). SheetJS (`xlsx`) as an npm dependency for browser-side spreadsheet parsing — bundled at build time, never a server call.
Deployment: GitHub push to main → Netlify auto-deploys from main. Claude Code does not connect to Netlify; the builder connected the repo to the Netlify site and Supabase to that site with the Supabase extension in an earlier session. A redeploy is needed after any environment variable change (Vite bakes browser-side variables in at build time).

## Arms
Export — browser only, no server function — XLSX: the blank official questionnaire template served as a static asset from /assets/ through an anchor with the `download` attribute. Nothing is generated at runtime and no supplier data is ever written into it.
Email, AI API, and Scheduled Automation arms: Not Active. The magic-link email is sent by Supabase Auth's own mechanism, not by an Email Arm — do not build a custom email arm for it.

## Environment Variables
VITE_SUPABASE_URL — written by the Supabase extension — browser — public
VITE_SUPABASE_ANON_KEY — written by the Supabase extension — browser — public; RLS protects the data
No new variables for this build. Supabase Auth's magic link works off the existing pair above.

## Supabase
Project: "The Corporate" — already exists. Project URL: https://smnrfopzzzhazkehcqqn.supabase.co (ref `smnrfopzzzhazkehcqqn`). docs/supabase-setup.md is the schema source of truth. Read it before any database work. Never recreate tables or policies that already exist. Update it at every save point that touches the database.
Plan: Free — explicitly confirmed acceptable for current testing-scale traffic. This is also why Supabase's own built-in auth mailer (low send rate) is tolerated rather than a Resend-verified domain; see Known Issues.

Tables: `companies` (unchanged). `submissions` (existing fields unchanged) plus new `verified_user_id uuid not null default auth.uid() references auth.users(id)`.

RLS — enabled on both tables, never disabled. Population pattern: open self-verification (single role, no named list) — anyone may prove an email and become a Verified Supplier; nobody is invited. Every rule below is lifted from docs/access-matrix.md; build each with the mechanism its policy plan names.
- `companies`: no policy for any role, on any action. The only route in is `resolve_company()`.
- `submissions`: `anon` — no policy on any action (this replaces v3.0's `anon` `check (true)` INSERT policy — the actual fix this build makes). `authenticated` (Verified Supplier) — INSERT only, `WITH CHECK (contact_email = auth.email() AND verified_user_id = auth.uid())`; no SELECT, UPDATE, or DELETE policy for any role.
- `resolve_company()`: execute granted to `authenticated` only — moved from `anon`, revoked from `anon` and `public`.

Auth, as built: **magic link (passwordless)**, not the framework's default email+password — a deliberate deviation because this is an open, unvetted-supplier context, not an admin-managed list. Settings: "Enable sign-ups" ON (open signup is the design), email OTP/magic link flow, no password anywhere. No Change Password screen and no admin password reset exist or are needed — the only recovery path is requesting a fresh link (the Check Your Inbox screen's resend action). No named first holders to seed; the population is open. Login upgrade path (a Resend-verified sending domain, same mechanism otherwise) is a handover item, not a build item.

Every access rule lives in docs/access-matrix.md; build each line of its policy plan with the mechanism it names and never loosen a table to make a screen work.

After setup, update docs/supabase-setup.md at every save point that touches the database, following its existing structure.

## Hard Rules
- API keys never hardcoded or committed — always read from environment variables, through the Supabase client. The anon key is public by design, shipped in the bundle; RLS is what makes that safe.
- Netlify Identity: never. Supabase Auth (magic link, as built above) is the only authentication system in this stack.
- RLS: enabled on every table from the moment it is created, never disabled on any table, at any tier. If a query fails, fix the policy or the query. `anon` has no policy and no table grant on either table.
- Migrations: every schema, policy, trigger, and function change goes through `apply_migration` with a descriptive name, saved as a file in supabase/migrations/, committed with the save point; `execute_sql` is for reads and data fixes only.
- Function contract: `resolve_company()` is the only SECURITY DEFINER function in this build, with a fixed `search_path`; execute is revoked from `anon` and `public`, granted to `authenticated` only. No RPC is callable by `anon`.
- A submission that fails to save never shows the confirmation screen; the transparency notice claims the information is stored, so reaching View 7 on a failed write would make the portal lie. Stay on the door, keep the answers, say plainly that nothing was sent, allow a retry.
- The transparency notice wording and the persistence behaviour change together, in one commit, always.
- The EcoVadis PDF and the uploaded/downloaded workbook are never uploaded to Supabase Storage or any server. Only filename and size are recorded, on the `submissions` row.
- Company matching at submit time (via `resolve_company()`): look up `companies` by `legal_name`, case-insensitive, leading/trailing whitespace ignored. On a match, reuse that `company_id` and overwrite the contact fields and `updated_at`. On no match, insert a new row. Never fuzzy matching.
- [From docs/access-matrix.md §7, verbatim] The refusal happens in the database, never only in the screen. `anon` has no policy and no table grant on either table after this build; the only write path is the `submissions` INSERT policy above.
- [From docs/access-matrix.md §7] Not applicable to this tool: there is no `role`, `is_admin`, or `active` column anywhere — one undifferentiated role, no admin flag — so there is nothing for a user to change even if they tried.
- [From docs/access-matrix.md §7] A `submissions` row is frozen for everyone, including the platform owner, from the moment it is inserted — final immediately, not "final after a transition." There is no update path in the app.
- [From docs/access-matrix.md §7] Nothing is deleted through the app. The platform owner may remove a row directly in the Supabase table editor (service role, bypasses RLS) if ever genuinely needed — GDPR is confirmed not applicable, so no anonymisation function is built.
- [From docs/access-matrix.md §7] `submissions` carries `verified_user_id` (set to `auth.uid()` on insert) alongside `contact_email` and `submitted_at` as its full audit trail. No `created_by`/`updated_by`/`updated_at` — the row is never updated.
- GDPR: not applicable, confirmed by the builder as a class/portfolio project — reconfirmed even after being shown that open signup plus login identities would normally trigger this section. This is a conscious override; do not reopen it without the builder revisiting it.
- Complexity: build no rate limit, queue, retry, scan, or monitor. If ever requested, it goes on the PROGRESS.md Backlog as "not in place; what it would take."

## Brand
Brand is governed by the data-leaf-brand skill at .claude/skills/data-leaf-brand/SKILL.md and its `tokens.css`. Invoke it for any UI, copy, or visual work. Colour roles below hold even if the skill is not loaded:
- `#EEF4F0` Mint Cream — default page background, light sections, input backgrounds, text on dark surfaces.
- `#DAD9D9` Silver — form containers, hero stat cards, body text inside dark cards, inactive progress steps.
- `#0B3142` Deep Space Blue — text/headings on light backgrounds, hero band, all six path/door card backgrounds.
- `#37663E` Deep Teal — section markers, input bottom borders, checkbox accents, every form submit button.
- `#B35634` Burnt Clay — navigation/CTA buttons, breadcrumbs, links, "(required)" tags, validation notices, active progress step.
- Never white backgrounds, never Tailwind blue or gray defaults, no dark mode or theme toggle.
- Type: DM Sans Medium (500) for headings/stat figures, Inter Regular (400) for body/labels/questions/table content.
- Voice: analytical, trustworthy, light. No hype, no alarmism, no exclamation points, no emoji.

## Business Rules
- Every door (Views 3a, 3b, 5, 6) opens with the identical five-field Company & Contact step. `contact_email` is now pre-filled from the verified session (`auth.email()`) and read-only on all four doors; legal name, registered country, contact name, and contact title remain free text, required, cannot advance otherwise.
- Verification gates everything: a supplier enters Verify Your Email → Check Your Inbox (with a resend action) before reaching Path Selection. An expired or already-used link shows Link No Longer Valid, with a path back to email entry — never a raw error.
- "S1" is retired as a numbered assessment section. The guided form (View 5) and upload review (View 6) cover the 28 S2–S7 questions only; denominators are 28 for both, 9 for View 3b (Q1–Q9); View 3a shows no count.
- Transparency notice text is exactly "Your information is stored for The Corporate's review." — above every submit control and on the confirmation screen. Never reworded, never a modal, never a checkbox.
- "Start another submission" clears in-browser state only; never undoes or alters a row already written to Supabase.
- Each verification is one-time per submission attempt — not a returning-user account. No persistent session across visits is expected or built.

Out of scope — do not build:
- Any review or admin screen inside the portal — reviewed directly in the Supabase table editor. Login for The Corporate's own team (no admin role exists). Save-and-resume for a supplier mid-submission.
- Storage of the actual uploaded/attached files. Any submission notification — email, webhook, or API. Download of a supplier's own completed answers; an internal EHS review dashboard; a Tier 1 response-rate tracker.
- AI scoring or gap analysis; automated EcoVadis validation; reading or parsing the uploaded EcoVadis PDF. Formal GDPR consent flow (checkbox, deletion mechanism).
- Dark mode, theme switching, or any user-selectable colour scheme. Any animation beyond the hero smooth scroll and the 200ms timeline hover.
- Cross-device magic link handling — suppliers are told to open the link on the device they started on.
- Custom sending domain / Resend integration — deferred until beyond testing-scale traffic (see Backlog).
- Password-based login of any kind; a Change Password screen — no passwords exist in this build.
- Any account settings, profile, or "my submissions" screen. Persistent sessions across return visits.
- Restricting who may verify or submit — open signup is the whole design; this is validation, not gatekeeping.

## Reference Docs
Read before building the related part:
- docs/product-spec.md (v3.0) and docs/product-spec-v3.1.md — v3.1 is the authoritative iteration spec for auth; v3.0 remains authoritative for everything v3.1 doesn't override; docs/product-spec-v2.1.md still governs View 1 and Section 10 visual detail.
- docs/supabase-setup.md — schema source of truth; read first, never recreate.
- docs/access-matrix.md — full form. Read before writing any RLS or touching a policy; every policy is built from it, with the mechanism it names.
- docs/user-stories.md — full form. Read before changing a screen or a role; every acceptance line is a screen test.
- .claude/skills/data-leaf-brand/SKILL.md — full brand system and tokens.css
PROGRESS.md in the root is read at every session start per the Session Protocol.
