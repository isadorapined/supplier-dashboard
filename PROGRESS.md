# PROGRESS — The Corporate Supplier Sustainability Portal 2026

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 4 — portal live and persisting; two deployment faults found and fixed
**Last updated:** 11 September 2026
**Live URL:** https://the-corporate-sep.netlify.app (Netlify project `the-corporate-sep`, deploys from `main`)
**Stage:** login and access rules together — access-matrix.md and user-stories.md (full run) are in, and CLAUDE.md was regenerated for v3.1 on 24 September 2026; this stage isn't absorbed into Current state until the access phase below is built and both gate halves pass.
**Supabase project:** created — ref `smnrfopzzzhazkehcqqn`, URL `https://smnrfopzzzhazkehcqqn.supabase.co`

## Current state
v3.0 is built and passing the full local test pass — 49 parser checks and three
browser suites, all green. The tool is Tier 2 as deployed today: every completed
submission is written to Supabase and linked to a reusable company record, with no
login in front of it yet.

Database is live in the **existing** Supabase project "The Corporate"
(`smnrfopzzzhazkehcqqn`, us-east-1, Free). `companies` and `submissions` are
built with RLS on both. `companies` carries **no anon policy at all** — supplier
contact details cannot be read from the browser — and all access to it goes
through `resolve_company()`, a `SECURITY DEFINER` function that does the
match-or-insert server-side and returns only a company id. `submissions` is
insert-only, currently open to `anon` with `check (true)` — this is exactly what
the v3.1 access phase below closes. docs/supabase-setup.md is the schema source
of truth (as of 11 September 2026 — still to be updated once the v3.1 access
phase touches the database).

All four doors open with the same five-field Company & Contact step, rendered
from one `CompanyContact` component and gated by one `identityProblems()` — so
criteria 2 and 3 hold by construction rather than by repetition. "S1" is gone as
a numbered section: the guided form is eight steps (Company & Contact, S2–S7,
Declaration), the parser reads 28 rows instead of 30, and both Path B
denominators are 28. View 3a's step 2 is exactly three fields plus the file
picker; View 3b's is exactly Q1–Q9.

The transparency notice reads "Your information is stored for The Corporate's
review." Files are still never stored — only filename and size reach the database.

## Last session
Builder reported completing a submission on the live site with nothing arriving
in the database. Traced it to v3.0 sitting unmerged in open PR #2 while `main`
was still v2.1. Merged, redeployed with both Netlify environment variables set,
found and fixed a second fault (a non-ISO-8859-1 character in the copied anon
key value broke `Headers.set()` before any request left the browser), and
confirmed a live submission at 14:53 UTC wrote both rows correctly. Criterion
20's persistence half is met.

## Remaining work
- [x] Netlify environment variables set and inlined by a fresh build; live
      submission confirmed writing to Supabase (session 4)
- [ ] Criterion 20, remainder — template downloads from the deployed site, and
      no 404s. The persistence half is done and verified.
- [ ] Delete the `isa` test company and its submission once no longer needed —
      they are real rows in `companies` and `submissions`
- [ ] Criterion 19 on real devices — mobile layout end to end
- [ ] Run `tests/persistence.test.mjs` with a service role key from an
      unproxied machine (still not exercised here; the live submission covers
      what it was standing in for)
- [ ] Builder reviews the "Why We Are Asking" body copy before deployment
- [ ] Builder confirms or replaces the "PROGRAMME CONTEXT" overline wording
- [ ] Builder reviews the light nav bar sitting above the dark hero band
- [ ] Confirm whether the supplier-facing wordmark should stay "Data Leaf" or
      become The Corporate's — the footer already reads "© 2026 The Corporate"
- [ ] (v3.1 revision) Configure Supabase Auth for magic link: "Enable sign-ups"
      ON, email OTP/magic link flow enabled, no password flow. Sender is
      Supabase's built-in auth mailer (accepted for testing-scale traffic —
      see Known Issues).
- [ ] (v3.1 revision) Build the three new screens: Verify Your Email, Check
      Your Inbox (with the resend action), Link No Longer Valid
- [ ] (v3.1 revision) Update the `CompanyContact` component so `contact_email`
      is sourced from the verified session (`auth.email()`) and read-only on
      all four doors; every other field stays free text
- [ ] (v3.1 revision) Access phase — login and rules together, one build,
      per docs/access-matrix.md: add `submissions.verified_user_id uuid not
      null default auth.uid() references auth.users(id)` (named migration);
      change the `submissions` INSERT policy from `anon`/`check (true)` to
      `authenticated` with `WITH CHECK (contact_email = auth.email() AND
      verified_user_id = auth.uid())`; move `resolve_company()`'s execute
      grant from `anon` to `authenticated`; update docs/supabase-setup.md in
      the same save point
- [ ] (v3.1 revision) GATE, half A (Claude Code) — through the API directly:
      attempt a `submissions` insert as `anon` (must refuse), an authenticated
      insert with a mismatched `contact_email` (must refuse), a `companies`
      call as any role (must refuse), and `resolve_company()` as `anon` (must
      refuse); paste every result into Refusal test record below
- [ ] (v3.1 revision) GATE, half B (Isadora, isadorapined@gmail.com) — verify
      her own email end to end, land on Path Selection (not Landing), complete
      one door, confirm the row in the Supabase table editor carries her
      `contact_email` and a `verified_user_id` matching her `auth.users` row.
      Both halves must pass before this stage deploys.
- [ ] (v3.1 revision) Local test pass — full walkthrough including the new
      verification flow, an expired/reused link, and the resend action
- [ ] (v3.1 revision) Acceptance criteria pass — verify criteria 21–28
      (existing criteria 1–20 already covered)
- [ ] (v3.1 revision) Push to main → Netlify auto-deploys

## Refusal test record
None yet. Filled by Claude Code at half A and by Isadora at half B (date, who,
cell tried, result). Kept, never cleared. Any future change to a rule re-runs
both halves before the next push.

## Build decisions
- Reused the existing Supabase project "The Corporate" rather than creating
  `the-corporate-supplier-portal`. It was already there and empty, and its name
  fits spec §4's own rationale — named for the client context so it can hold
  future tools — better than the proposed name did.
- `companies` has RLS on and no policy, instead of the anon `select` CLAUDE.md
  originally specified. The select would have exposed every supplier's contact
  name, title and email to anyone with the portal URL. A `SECURITY DEFINER`
  function closes that and also makes matching atomic, which a client-side
  select-then-insert cannot: a unique index on `lower(btrim(legal_name))` means
  two simultaneous submissions from one company cannot both insert.
- Submit is async and gated by a ref, not by state. The ref is read before any
  re-render, so a double-click cannot produce two `submissions` rows; the
  `saving` flag in state only drives the disabled button.
- View 7 renders from in-browser state, never a read-back. `submissions` is
  insert-only, so `.insert().select()` is refused by the policy.
- Notes travel inside `answers` as `<id>__notes` rather than in a second
  column. One JSON object holds a door's whole answer set, and the notes can
  never drift away from their question.
- `answers` is filtered to the submitting door's own ids, so a door the
  supplier opened, typed into, and backed out of leaves nothing behind.
- Session state is one object in `App.jsx`; views receive it plus an `update`
  function. No state library, no router — spec Section 8 rules out multi-URL
  routing.
- Answer keys are shared between doors. The 28 questions use the guided field
  ids (`S2-1` … `S7-5`) in both the guided form and the upload review, so the
  9.2 conditionals need no per-door special-casing. The template's two S1 rows
  and their `T1`/`T2` keys are gone entirely — the parser skips those rows.
- The identity field list lives in `questions.js` beside the `resolve_company`
  argument names, so the form and the database call cannot drift apart.
- shadcn/ui components are hand-written into `src/components/ui/` in the shadcn
  idiom (cva variants, a `cn` merge helper) rather than generated by the CLI,
  which needs interactive network access unavailable in the build session.
- Button variants are named for behaviour, not colour — `submit` is Deep Teal,
  `nav` is Burnt Clay, `back` is plain Deep Space Blue text.
- The six choice cards render through one `ChoiceCard` in `Chrome.jsx`.
- Door chooser overlines read "Door one" / "Door two".
- The "What Happens Next" section background moved from Silver to Mint Cream.
- `hoverOnlyWhenSupported` is set in `tailwind.config.js` for the timeline.
- Keyboard focus keeps the Burnt Clay `:focus-visible` outline from
  `index.css`. 10.4's "no outline" governs the resting field, not focus.
- Question ids carry a `data-qid` attribute and identity fields a
  `data-identity` attribute. The tests read those instead of matching on
  Tailwind classes.
- Question texts for the parser are copied verbatim off the workbook, trailing
  spaces and all. `src/lib/questions.js` says so at the top — never tidy them.
- SheetJS is a lazy `import()` inside the parser, so the 429 kB chunk is only
  fetched when a supplier actually opens the upload door.
- `.xlsx` uploads are checked for a ZIP signature before parsing.
- The browser suites stub the two Supabase calls rather than hitting the
  database, so they stay offline and deterministic.
- (v3.1 revision) Magic link, not email+password, chosen for the login: this is
  an open, unvetted-supplier context, not an admin-managed list — magic link
  needs no passwords to manage and fits open signup directly.
- (v3.1 revision) `verified_user_id` added to `submissions` rather than a
  `profiles` table: one undifferentiated role with no admin flag needs no
  profile row, just a durable, non-spoofable link from the row to the session
  that created it.

## Known issues
- **A corrupted API key value fails with no server-side trace whatsoever.**
  If `VITE_SUPABASE_ANON_KEY` contains any character outside ISO-8859-1 — an
  ellipsis, a smart quote, an en dash — supabase-js throws before the request
  leaves the browser. Always use the Supabase dashboard's copy button, never a
  mouse selection.
- **Netlify env vars are inlined at build time, so a rebuild is mandatory**
  after any change to either Supabase variable — trigger "Deploy project
  without cache". Leave "Contains secret values" unticked on both.
- **Work reaches `main` only by merging a PR, not by pushing.** Treat a save
  point as incomplete until the PR is merged and Netlify has deployed.
- Free plan pauses after roughly a week without traffic, and a paused project
  refuses writes. Most likely real cause of a failed submission.
- No Data Leaf logo file. The wordmark renders as DM Sans Medium type in Deep
  Space Blue — flag for replacement if a logo arrives.
- The nav bar sits directly above the dark hero band; builder review pending.
- The "Why We Are Asking." overline ships with the placeholder wording
  "PROGRAMME CONTEXT" unless the builder replaces it.
- "Why We Are Asking" body copy is drafted by Claude Code and needs builder
  review before the first deployment.
- EcoVadis badge options ship as None / Committed / Other. The source file lists
  no options — confirm with The Corporate if it matters.
- The three tolerated template defects are handled in the parser, not fixed in
  the shipped `.xlsx`. If the template is ever corrected, the `templateText`
  strings in `src/lib/questions.js` must be updated to match.
- The shipped template still contains its two S1 rows. They are simply not read
  any more.
- `xlsx@0.18.5` is still the newest build on the npm registry and carries two
  open advisories. SheetJS's fixed 0.20.x is served only from
  `cdn.sheetjs.com`, which the build environment blocks. Exposure is limited:
  parsing runs on a file the visitor chose themselves, the 10 MB cap is applied
  before any parse, and `sheet_to_json` is called with `header: 1`.
- The v1.0 template row 18 carries an internal note in its NOTES / EVIDENCE cell
  ("AUTO-FLAG: Yes triggers PFAS Risk review"). It parses as that question's
  notes and shows in the review table.
- Supabase's linter reports two findings — `rls_enabled_no_policy` on
  `companies` (INFO) and `anon_security_definer_function_executable` on
  `resolve_company` (WARN, and will read differently once execute moves to
  `authenticated` in the v3.1 build — re-check the linter after that change).
- Playwright 1.63 expects a Chromium build newer than the one installed in the
  build environment; needs `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Spec revised to v3.1 on 24 September 2026 — CLAUDE.md regenerated by Project
  Governor. Adds email verification (magic link), promotes Tier 2 → Tier 3.
- Supabase's built-in auth mailer (not a Resend-verified domain) has a low
  send rate — explicitly accepted for current testing-scale traffic. Move to a
  verified sending domain if real supplier volume arrives (see Backlog).

## Backlog
- Handover: login upgrade path — same magic link mechanism, moved onto a
  Resend-verified sending domain (~$10/year, one-time domain setup) once real
  supplier volume needs it. Nothing about the flow or the rules changes.
- Cross-device magic link handling (started on one device, opened on another)
  — confirmed acceptable; suppliers are told to open the link on the same
  device they started on.
- Password-based login of any kind, and a Change Password screen — not
  applicable, no passwords exist in this build.
- Any account settings, profile, or "my submissions" screen — not requested;
  a verified session exists only to gate one submission.
- Persistent sessions across return visits — each submission attempt verifies
  fresh; this is not a login suppliers are expected to reuse.
- Restricting who may verify or submit — explicitly out of scope; open signup
  is the whole design (validation, not gatekeeping).
- `resolve_company()`'s own parameters are not checked against `auth.email()`
  — an authenticated caller could still overwrite an existing company's
  contact fields with arbitrary values by passing a matching legal name.
  Pre-existing since v3.0 under `anon`; unaffected by this iteration. Flag for
  a future spec if it ever matters.
- No admin role, no withdraw/reinstate/anonymise mechanism — GDPR confirmed
  not applicable for this class/portfolio project; revisit if that changes.

## Notes for next session
None.
