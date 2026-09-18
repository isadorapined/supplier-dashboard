# PROGRESS — The Corporate Supplier Review Dashboard 2026

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1 — build in progress
**Last updated:** 18 September 2026
**Live URL:** none yet [Rule: fill in after the first successful deploy]

## Current state
First Session Setup is done: `docs/` holds product-spec.md (v1.1) and
supabase-setup.md, the brand skill is installed at
`.claude/skills/data-leaf-brand/`, and the portal's `questions.js`,
`ecovadis.js` and `format.js` sit unchanged in `src/lib/`. `.gitignore` and
`.env.example` are in place; `.env.local` exists locally and is gitignored.

**Database is complete.** Six migrations applied via Supabase MCP:
`submissions.status` (default `new`, check-constrained, indexed) with the
one-time backfill; the anon insert policy tightened to `status = 'new'` under
its original name; `submission_status_changes`; the AFTER INSERT superseding
trigger; `set_submission_status()` granted to `authenticated` only; and
authenticated select policies on all three tables. No write policy exists for
`authenticated` anywhere. `resolve_company()` is untouched and still revoked
from `authenticated`. Verified by direct role tests — see the two "Verified
behaviour" tables in docs/supabase-setup.md.

**Frontend is complete and builds clean** (`npm run build`). React + Vite +
Tailwind on the Data Leaf tokens: Login, the three dashboard sections
(Overview, Risk Flag Board, Supplier Register) and the supplier detail page
with status panel, timeline and other-submissions list. Verified locally
against fixture data with a throwaway preview harness (since removed):
counts, pie, flag indicators, not-assessable placement and sort, both-route
duplication, search, the seven single-flag filters, the Save-status enable
rules, and the superseded lock all behave as specified.

## Last session
Session 1. Found the Supabase project paused (free-plan idle) and restored it —
that had taken the live portal down too; nothing was lost. Ran First Session
Setup, applied all six database migrations, and built the whole frontend.
Corrected two bugs found while testing: the superseding trigger logged a
hardcoded `new` as `from_status` instead of the row's real previous status, and
the detail page printed the route twice ("Questionnaire — Questionnaire —
guided form"). Could not push — see Known issues.

## Remaining work
- [ ] **Builder:** confirm "Allow new users to sign up" is OFF in Supabase →
      Authentication → Providers → Email (criterion 3). This session could not
      reach the Supabase API to test it — outbound network is blocked here.
- [ ] **Builder:** create the team login accounts in Authentication → Users
- [ ] Log in against the live database and walk every view (criteria 1, 2, 6,
      11, 12, 20 end-to-end; the logic behind them is already verified)
- [ ] Criterion 18: make a real submission from the live portal
      (https://the-corporate-sep.netlify.app) and confirm it still reaches its
      confirmation screen and lands with `status = 'new'`
- [ ] Deploy to Netlify: builder creates the dashboard's own site from this
      repo, adds both VITE_ variables ("Contains secret values" unticked), then
      runs "Deploy project without cache"
- [ ] Builder: copy docs/supabase-setup.md back into the portal repo's docs/
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

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

## Notes for next session
None.
[Rule: the builder writes here between sessions. Claude Code reads these aloud at session start, acts on them, then clears this section.]
