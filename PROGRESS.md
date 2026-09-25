# PROGRESS — The Corporate Supplier Review Dashboard 2026

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 2 — v2.0 access phase built; half A of the refusal test passed; waiting on half B and deploy
**Last updated:** 25 September 2026
**Live URL:** none yet [Rule: fill in after the first successful deploy]
**Stage:** login and access rules together — the v2.0 access phase (schema, policies, the admin function, the Admin Panel, the Change password screen) is built as one phase and gates on the refusal test below. Half A passed; half B is open.
**Supabase project:** created — ref `smnrfopzzzhazkehcqqn`, URL `https://smnrfopzzzhazkehcqqn.supabase.co`

## Current state
v1.1 is complete (Login, Overview, Risk Flag Board, Register, detail page,
status lifecycle, superseding trigger). v2.0 is now built on top of it.

**Two tools, two access models, one database.** The portal (Tool A) went
live with v3.1 on 25 September 2026: suppliers verify an email by magic link,
with open signup, so every verified supplier is `authenticated`. The builder
confirmed the design: magic link for the portal; login plus roles for the
dashboard. So every dashboard gate now checks for an **active `user_roles`
row**, never bare `authenticated` and never a JWT claim.

**Database (v2.0) is complete.** One migration,
`dashboard_v2_user_roles_and_team_gate` (file in `supabase/migrations/`):
- `user_roles`: own-row SELECT only, no write policy, no anon grant.
- The single-Admin rules are held by the database: a partial unique index
  (at most one Admin), a statement-end constraint trigger (at least one), and
  a check (Admin must be an active EHS/ESG account). Together these refuse
  self-deactivation and self-demotion.
- Isa is seeded as ESG + Admin.
- The three read policies and `set_submission_status()` moved from the portal
  session's stopgap JWT flag (`app_metadata.role = 'reviewer'`) to an active
  `user_roles` row. `set_submission_status()` now refuses unless the caller is
  active EHS/ESG (`DL403`).

**Admin function is built:** `netlify/functions/admin-actions.js`. Actions:
list, invite, set_active (ban plus flag), reset_password, set_role, move_admin.
On every call it checks for a valid session and an active Admin row. It
refuses self-changes, undoes half-done actions, and returns the fresh roster
each time. Tested against a stubbed Supabase: non-admin, logged-out and
self-lockout calls are refused with no writes; the happy paths send the
expected writes; move_admin is a single upsert.

**Frontend is built and builds clean:**
- The top bar shows email · role, Change password, and an Admin Panel link
  for the Admin only.
- The Admin Panel (View 4) has the roster, invite with a starter password
  shown once, deactivate/reactivate, reset password, reassign role and Make
  Admin. A direct visit to `/admin` by a non-admin redirects to the Dashboard.
- Procurement sees no status control and no comment field. Existing comments
  stay visible.
- "Reason" is relabelled "Review comment".
- The role is re-read on every load and whenever the tab regains focus.
- A login with no active role row (a supplier, or a deactivated account) is
  signed out with "This login does not have access to the dashboard."
- `netlify.toml` sets the build, the functions directory and the SPA fallback.
- Checked in Chromium with mocked Supabase responses as Procurement and as the
  Admin; screens behave as specified, with no page errors.
- The bundle contains no `service_role` string (criterion 34).

`docs/` now holds access-matrix.md and user-stories.md, moved from the root.

## Last session
Session 2. Found that the portal's v3.1 had already gone live on the shared
database (open magic-link signup, plus a JWT-flag stopgap on the dashboard's
policies), which the v2.0 spec did not account for. The builder confirmed the
two-model design. Built the whole v2.0 access phase: `user_roles`, the updated
function and policies, the Netlify admin function, the Admin Panel, Change
password, and role-based hiding. Ran and recorded half A.

## Remaining work
- [ ] **Builder:** add `SUPABASE_SERVICE_ROLE_KEY` to Netlify's environment
      variables (copy button, tick "Contains secret values"). The function also
      reads `VITE_SUPABASE_URL`, which is already there.
- [ ] **Builder:** create the dashboard's own Netlify site from this repo if it
      doesn't exist yet. Set both `VITE_` variables plus the service role key,
      then "Deploy project without cache".
- [ ] **Builder:** log in as Isa and invite isabela@gmail.com (EHS) and
      isabel@gmail.com (Procurement) from the Admin Panel. Hand each starter
      password over directly.
- [ ] (v2.0) GATE, half B — do not treat this phase as live until it passes.
      Isabela, Isa and isabel each log in on the deployed screens and walk
      criteria 23–34. Every `no` is refused, every `own` returns only their own
      row, a deactivated account is locked out, and Procurement sees no
      controls. Record the results below.
- [ ] Log in against the live database and walk every v1.1 view (criteria 1,
      2, 6, 11, 12, 20 end to end — the logic is already verified)
- [ ] Criterion 18 (re-worded for portal v3.1): make a real submission from
      the live portal and confirm it lands with `status = 'new'` and shows in
      the dashboard
- [ ] **Builder:** decide what to do with the two logins that are not on the
      team: `cohortfriends@gmail.com` (created 18 Sep, never signed in) and
      `piff@gmail.com` (24 Sep). Neither has a `user_roles` row, so neither
      can see anything in the dashboard. Leave them, or remove them in
      Authentication → Users.
- [ ] **Builder:** re-run the Project Governor on spec v2.0 plus portal v3.1.
      CLAUDE.md's Supabase section still says "Allow new users to sign up
      stays OFF", "authenticated may select all rows (unchanged)", "anon may
      insert … (unchanged)" and that `resolve_company()` "stays revoked from
      authenticated". None of those is true since portal v3.1. The built rules
      are in docs/supabase-setup.md.
- [ ] Builder: copy docs/supabase-setup.md back into the portal repo's docs/.
      The portal's copy has not seen `user_roles` or the new read policies.
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

## Refusal test record
**Half A — Claude Code, 25 September 2026, via Supabase MCP** (`set local
role` plus `request.jwt.claims`, one transaction, rolled back). Full table in
docs/supabase-setup.md → RLS → Refusal test — half A. Summary:
- anon: every table read refused or 0 rows; `set_submission_status()`
  refused (permission denied).
- Verified supplier (authenticated, no role row): 0 rows from all four tables;
  `set_submission_status()` refused `DL403`; self-insert into `user_roles`
  refused.
- Procurement: reads everything; `user_roles` own row only (Isa's row: 0);
  `set_submission_status()` refused `DL403` for accepted and for
  needs_review; direct writes to `user_roles`, `submissions` and the status
  log refused or 0 rows.
- Isa (ESG, Admin): own `user_roles` row only; a direct self-update is
  refused; status function passes the role check.
- Deactivated, old session still open: 0 rows. Reassigned Procurement →
  EHS: the next status call is allowed, with no re-login.
- Admin invariants (service-role path): no Admin, a second Admin, an Admin
  who is deactivated or Procurement, and deleting the Admin's row are all
  refused. Moving Admin in one statement succeeds.
- Admin function (stubbed Supabase): GET 405; no or invalid token 401; a
  non-admin or no-row caller gets 403 for list, invite and self-promote with
  no writes; the Admin changing their own active flag or role gets 403;
  moving Admin to Procurement gets 409.

**Half B — open.** [Rule: filled by the builder: date, who, cell tried,
result. Kept, never cleared; the handover package copies it. Any later
change to a rule re-runs both halves before the push.]

## Build decisions
- Door display labels confirmed pre-build (see CLAUDE.md Business Rules).
- shadcn/ui is followed as a pattern, not installed: `src/components/ui.jsx`
  holds hand-written primitives on the Data Leaf tokens.
- Tailwind's stock palette is **replaced**, not extended, so off-brand
  classes fail the build.
- `set_submission_status()` raises custom SQLSTATEs (`DL401`, `DL403`,
  `DL409`, `DL422`) so the UI can tell the refusals apart.
- The superseding trigger swallows unexpected errors into a `WARNING`, so the
  portal never shows a false save failure.
- The pie chart is hand-drawn SVG arcs.
- (v2.0) Team accounts are created from the in-app Admin Panel, not
  Authentication → Users.
- (v2.0) Dashboard access is an active `user_roles` row, not `authenticated`
  and not a JWT claim. Builder's direction, because portal v3.1 made every
  supplier `authenticated`. It is also a live read, so criteria 26 and 30 hold
  without re-login. It replaces the portal session's `app_metadata.role`
  stopgap.
- (v2.0) Single-Admin rule: partial unique index (spec default) plus a
  deferrable constraint trigger for "at least one", checked at statement end.
  So moving Admin is one upsert statement, and no Postgres admin function was
  needed (CLAUDE.md forbids one).
- (v2.0) Deactivate = Auth ban plus `is_active = false`. The ban stops
  refreshes and logins; the flag is what RLS and the status function read, so
  an open session gets nothing on its very next request. The app also calls
  `getUser()` on load and signs out a banned or role-less login.
- (v2.0) Nobody changes their own row through the function, Admin included.
  The Admin's only self-change is Make Admin on someone else. The Admin
  cannot reset their own password there either; they use Change password.
- (v2.0) Invite refuses an email that already has a login (for example a
  supplier who verified on the portal) rather than turning that login into a
  team account. A half-made invite is rolled back by deleting the new login.
- (v2.0) Starter passwords are 16 characters from an alphabet without
  look-alike characters, generated server-side with `crypto.randomInt`.
- (v2.0) Change password asks for at least 8 characters, stricter than
  Supabase's default of 6.
- (v2.0) Routes are real paths (`/admin`, `/password`) with a Netlify SPA
  fallback. Section anchors stay as `#overview` etc.

## Known issues
- **Pushes go to `claude/hopeful-darwin-r0tlof`, not `main`.** This session
  was pinned to that branch. Merge it to main (PR) to deploy.
- Outbound network to `*.supabase.co` is blocked in Claude Code's cloud
  environment, so the app could not be run against the live database here.
  The database was tested directly through Supabase MCP. The UI was tested
  with mocked responses, and the admin function with a stubbed Supabase.
- The admin function has not run against real Supabase yet: it needs the
  service role key in Netlify. Half B is its first real run.
- Free plan: the project pauses after about a week idle and takes both tools
  down.
- CLAUDE.md is stale on the points listed under Remaining work (Governor
  re-run). The portal repo's copy of docs/supabase-setup.md is stale too.
- `answers` is schemaless and keyed by questions.js ids. Historical rows keep
  old keys if ids ever change.
- Supabase Auth "leaked password protection" is off (advisor WARN). It's
  optional; switching it on in Auth settings would harden Change password.

## Notes for next session
None.
[Rule: the builder writes here between sessions. Claude Code reads these aloud at session start, acts on them, then clears this section.]
