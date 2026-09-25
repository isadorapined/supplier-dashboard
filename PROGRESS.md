# PROGRESS — The Corporate Supplier Review Dashboard 2026

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1 — build in progress
**Last updated:** 25 September 2026 — spec revised to v2.0, PROGRESS.md updated by Project Governor
**Live URL:** none yet [Rule: fill in after the first successful deploy]
**Stage:** login and access rules together — the v2.0 access phase (schema, policies, the admin function, the Admin Panel, the Change password screen) is built as one phase and gates on the refusal test below
**Supabase project:** created — ref `smnrfopzzzhazkehcqqn`, URL `https://smnrfopzzzhazkehcqqn.supabase.co`

## Current state
First Session Setup is done: `docs/` holds product-spec.md (now v2.0 — replace
the v1.1 copy), the brand skill is installed at
`.claude/skills/data-leaf-brand/`, and the portal's `questions.js`,
`ecovadis.js` and `format.js` sit unchanged in `src/lib/`. `.gitignore` and
`.env.example` are in place; `.env.local` exists locally and is gitignored.
Add `access-matrix.md` and `user-stories.md` to `docs/` this session — they
did not exist for v1.1.

**Database (v1.1 scope) is complete.** Six migrations applied via Supabase MCP:
`submissions.status` (default `new`, check-constrained, indexed) with the
one-time backfill; the anon insert policy tightened to `status = 'new'` under
its original name; `submission_status_changes`; the AFTER INSERT superseding
trigger; `set_submission_status()` granted to `authenticated` only; and
authenticated select policies on all three tables. No write policy exists for
`authenticated` anywhere. `resolve_company()` is untouched and still revoked
from `authenticated`. Verified by direct role tests — see the two "Verified
behaviour" tables in docs/supabase-setup.md. `user_roles` does not exist yet —
it is v2.0 scope, below.

**Frontend (v1.1 scope) is complete and builds clean** (`npm run build`).
React + Vite + Tailwind on the Data Leaf tokens: Login, the three dashboard
sections (Overview, Risk Flag Board, Supplier Register) and the supplier
detail page with status panel, timeline and other-submissions list. Verified
locally against fixture data with a throwaway preview harness (since removed):
counts, pie, flag indicators, not-assessable placement and sort, both-route
duplication, search, the seven single-flag filters, the Save-status enable
rules, and the superseded lock all behave as specified. The Admin Panel
(View 4) and the role-based hiding of controls for Procurement do not exist
yet — they are v2.0 scope, below.

## Last session
Session 1. Found the Supabase project paused (free-plan idle) and restored it —
that had taken the live portal down too; nothing was lost. Ran First Session
Setup, applied all six database migrations, and built the whole v1.1 frontend.
Corrected two bugs found while testing: the superseding trigger logged a
hardcoded `new` as `from_status` instead of the row's real previous status, and
the detail page printed the route twice ("Questionnaire — Questionnaire —
guided form"). Could not push — see Known issues.

## Remaining work
- [ ] **Builder:** confirm "Allow new users to sign up" is OFF in Supabase →
      Authentication → Providers → Email (criterion 3). This session could not
      reach the Supabase API to test it — outbound network is blocked here.
- [ ] (v2.0 revision) Build `user_roles` via Supabase MCP: fields per
      docs/product-spec.md §5 (`auth_user_id`, `email`, `role`, `is_admin`,
      `is_active`), the partial unique index on `is_admin`, and the RLS from
      docs/access-matrix.md (own-row read only, no direct authenticated
      writes) — one named migration
- [ ] (v2.0 revision) Update `set_submission_status()` to add the
      role ∈ (ehs, esg) and `is_active = true` check
- [ ] (v2.0 revision) Build the Netlify admin function
      (`netlify/functions/admin-actions.js`) for invite, deactivate/
      reactivate, reset password, and reassign role/Admin, using the service
      role key; it verifies the caller is authenticated and `is_admin` on
      every call
- [ ] (v2.0 revision) Build the Admin Panel (View 4): roster table, invite
      form (starter password shown once), deactivate/reactivate toggle,
      reset-password button, reassign-role dropdown, move-Admin control;
      visible only to the current Admin — a direct URL visit by anyone else
      redirects to the Dashboard
- [ ] (v2.0 revision) Update the Register and detail views: hide the status
      control and comment field entirely for Procurement; top bar shows the
      logged-in user's role next to their email
- [ ] (v2.0 revision) Build the Change password screen (signed-in user only,
      Supabase Auth `updateUser()`)
- [ ] (v2.0 revision) **Builder:** add `SUPABASE_SERVICE_ROLE_KEY` to
      Netlify's environment variables (copy button, tick "Contains secret
      values")
- [ ] (v2.0 revision) **Builder:** confirm whether Isa's v1.1 login already
      exists in Supabase Auth (spec §15, non-blocking); seed her
      `user_roles` row (`role = 'esg'`, `is_admin = true`) either way, then
      invite Isabela and isabel fresh through the new Admin Panel
      — *(supersedes the earlier "create the team login accounts in
      Authentication → Users" item: that door is now the Admin Panel)*
- [ ] Log in against the live database and walk every v1.1 view (criteria 1,
      2, 6, 11, 12, 20 end-to-end; the logic behind them is already verified)
- [ ] Criterion 18: make a real submission from the live portal
      (https://the-corporate-sep.netlify.app) and confirm it still reaches its
      confirmation screen and lands with `status = 'new'`
- [ ] (v2.0 revision) GATE, half A (Claude Code): try every `no` cell and the
      `own` boundary on `user_roles · read`, through the API, as each named
      person and logged out — paste results into Refusal test record below
- [ ] (v2.0 revision) GATE, half B (the named people) — do not deploy this
      phase until it passes: Isabela, Isa and isabel each log in on the
      screens; every `no` in docs/access-matrix.md is refused, every `own`
      returns only their rows, a deactivated account is fully locked out,
      and Procurement sees no controls anywhere
- [ ] Acceptance criteria pass — verify criteria 23–34 (and re-confirm 1–22
      still hold) before deploy
- [ ] Deploy to Netlify: builder creates the dashboard's own site from this
      repo, adds both `VITE_` variables and `SUPABASE_SERVICE_ROLE_KEY`
      ("Contains secret values" unticked for the `VITE_` pair, ticked for the
      service role key), then runs "Deploy project without cache"
- [ ] Builder: copy docs/supabase-setup.md back into the portal repo's docs/
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

## Refusal test record
None yet. [Rule: filled by Claude Code at half A and by the builder at half B:
date, who, cell tried, result. Kept, never cleared; the handover package
copies it. Any later change to a rule re-runs both halves before the push.]

## Build decisions
- Door display labels confirmed pre-build (see CLAUDE.md Business Rules).
- shadcn/ui is followed as a pattern, not installed: `src/components/ui.jsx`
  holds hand-written composable primitives on the Data Leaf tokens. The CLI
  scaffold ships Tailwind gray/blue defaults the brand forbids.
- Tailwind's stock palette is **replaced** in `tailwind.config.js`, not
  extended, so `bg-white` / `text-gray-500` / `bg-blue-600` fail the build
  rather than shipping off-brand. Preflight's gray-400 placeholder and
  blue-500 ring default are overridden in `src/index.css`.
- `set_submission_status()` raises custom SQLSTATEs (`DL401`, `DL409`,
  `DL422`) so the UI can tell the "superseded and locked" refusal from a
  general failure — the spec words those two messages differently. Matching on
  message text would have been brittle.
- The superseding trigger swallows unexpected errors into a `WARNING`. It runs
  inside the portal's insert, and a raise would show suppliers a false save
  failure (spec §5 rule 3).
- The pie chart is hand-drawn SVG arcs — two slices did not justify a chart
  dependency. A single 100% slice is drawn as a circle, since an arc whose
  start and end coincide renders nothing.
- (v2.0 revision) Team account creation moves from direct entry in Supabase
  Authentication → Users to the in-app Admin Panel's invite flow. The earlier
  "create the team login accounts" task is superseded, not duplicated.

## Known issues
- **Cannot push to GitHub from this session.** `git push` returns 403: the
  Claude GitHub App is not installed for `isadorapined/supplier-dashboard`.
  Two commits are sitting on the local branch `claude/blissful-darwin-vnivmn`.
  Fix at https://github.com/apps/claude/installations/select_target or by
  reconnecting GitHub in claude.ai settings, then push.
- Commits are on `claude/blissful-darwin-vnivmn`, not `main` as CLAUDE.md's
  save-point rule says — this session was pinned to that branch. Merge it to
  main once the push works.
- Outbound network to `*.supabase.co` is blocked in this environment, so the
  app could not be run against the live database here, and criteria 3 and 18
  are untested. Everything reachable through Supabase MCP was tested directly.
- Builder decision still open: delete the `isa` test company and its two
  submissions? They now show in the dashboard (one current, one superseded).
  Deleting is a Supabase dashboard task — the tool cannot delete.
- Free plan: the project pauses after about a week idle and takes both tools
  down. It was found paused at the start of this session and restored.
- The portal repo's CLAUDE.md and docs/supabase-setup.md are now stale.
- `answers` is schemaless and keyed by questions.js ids. Historical rows keep
  old keys if ids ever change.
- Spec revised to v2.0 on 25 September 2026 — CLAUDE.md regenerated by
  Project Governor. Access model changed A2 → A3: added EHS/ESG/Procurement
  roles and an Admin capability (`user_roles` table, a new Netlify admin
  function, and the Admin Panel). None of it is built yet — see Remaining work.

## Notes for next session
None.
[Rule: the builder writes here between sessions. Claude Code reads these aloud at session start, acts on them, then clears this section.]
