# PROGRESS — The Corporate Supplier Review Dashboard 2026

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 0 — build not started
**Last updated:** 18 September 2026 — by Project Governor, pre-build
**Live URL:** none yet [Rule: fill in after the first successful deploy]

## Current state
Nothing built. Repo contains CLAUDE.md, PROGRESS.md, product-spec.md (v1.1), supabase-setup.md (copied from the portal repo, last updated 11 Sep 2026, session 3), data-leaf-brand SKILL.md and tokens.css (brand skill, installed in session 1), and questions.js, ecovadis.js and format.js (portal src/lib files, copied in session 1).
[Rule: this section describes what exists and works right now — never what is planned. Completed checklist items get absorbed here in compressed form.]

## Last session
None — the first build session has not happened yet.
[Rule: 3–5 lines maximum. Replace each session — what was built, changed, or fixed.]

## Remaining work
- [ ] First Session Setup: create docs/, move reference files, install the data-leaf-brand skill, copy the three portal files into src/lib/, commit (see CLAUDE.md Session Protocol)
- [ ] Connect to Supabase project "The Corporate" and read docs/supabase-setup.md before any database work
- [ ] Database 1: submissions.status column + one-time backfill + tighten the anon insert policy to status = 'new' (spec §5 rules 1, 2, 5)
- [ ] Database 2: submission_status_changes table + superseding trigger + set_submission_status() + authenticated read policies (spec §5 rules 3, 4; §6)
- [ ] Auth: email and password, invite-only — confirm with the builder that "Allow new users to sign up" is off, then update docs/supabase-setup.md
- [ ] Builder: create the team login accounts in Supabase → Authentication → Users → Add user
- [ ] Build View 1 Login: email and password only, no data fetched before login
- [ ] Build View 2 Section A Overview: three current-submission counts and the route pie chart
- [ ] Build View 2 Section B Risk Flag Board: seven flags per company, sort and single-flag filter
- [ ] Build View 2 Section C Supplier Register: current submissions, sort and search, click through to detail
- [ ] Build View 3 Supplier Detail: identity, content per door, status panel, timeline, other submissions
- [ ] Local test pass: full walkthrough of every view, including a live portal submission (criterion 18)
- [ ] Acceptance criteria pass: verify all 22 criteria in spec Section "Acceptance Criteria" before deploy
- [ ] Deploy to Netlify: builder creates the dashboard's own site from this repo, adds both VITE_ variables in the Netlify dashboard, then runs "Deploy project without cache"
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

## Build decisions
- Door display labels confirmed pre-build (see CLAUDE.md Business Rules).
[Rule: one line per decision made during the build that is not in the spec — prompt structures, field formats, naming choices, library picks. Future sessions depend on these to stay consistent.]

## Known issues
- Builder decision needed before Database 1: delete the `isa` test company and its submission before the backfill runs?
- After deploy: builder copies the updated docs/supabase-setup.md back into the portal repo's docs/. The portal's CLAUDE.md is also stale and should be updated in its next session.
- Free plan: the project pauses after about a week idle and takes both tools down. Restore it in the Supabase dashboard.
- Linter: `anon_security_definer_function_executable` on resolve_company is intentional. Expect the same kind of finding for set_submission_status (authenticated). `rls_enabled_no_policy` on companies disappears once the authenticated select policy exists. That is expected.
- The portal never reads submissions back (anon is insert-only, no .select()). Keep anon select absent.
- answers is schemaless and keyed by questions.js ids. Historical rows keep old keys if ids ever change.
- The portal's setup note "grant resolve_company to authenticated when auth arrives" is overridden by spec v1.1: it stays revoked.
[Rule: bugs, edge cases, and deferred fixes. One line each. Remove when resolved.]

## Notes for next session
None.
[Rule: the builder writes here between sessions. Claude Code reads these aloud at session start, acts on them, then clears this section.]
