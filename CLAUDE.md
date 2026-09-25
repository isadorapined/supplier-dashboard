# The Corporate Supplier Review Dashboard 2026

## Identity
An internal, login-protected dashboard where a small invited team at The Corporate reviews every supplier submission the portal has saved, sees risk flags, and sets a review status and comment. EHS and ESG can review; Procurement can only view. One EHS or ESG account also holds an Admin capability, managed from an in-app Admin Panel, to invite team members, deactivate access, reset passwords, and reassign roles.
Tier: 3 — data persists to Supabase, login is required, and permissions differ by role (D3+A3, changed from D3+A2 in v1.1).
Spec version governed: v2.0, the version of docs/product-spec.md these rules were derived from.
Position: Tool B of 2 in The Corporate stack. It shares the Supabase project with The Corporate Supplier Sustainability Portal 2026 (Tool A, public, no login, created the schema, live at https://the-corporate-sep.netlify.app) and builds on the portal's existing schema. This dashboard's copy of docs/supabase-setup.md is the current one; after any database change here, copy it back into the portal repo's docs/.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md. If its version is newer than the "Spec version governed" line in this file, STOP. Tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it." Do not build against a stale CLAUDE.md.
3. Read PROGRESS.md in the project root. It is the current state of this build. If it is missing, recreate it with the structure at the end of this section, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content, repeat the notes back to the builder, treat them as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table, column, policy, function, trigger, or auth change), update docs/supabase-setup.md in the same save point, and make sure the migration file is saved in supabase/migrations/. Tell the builder to copy the refreshed file back into the portal repo's docs/.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one. An ending session is a save point.

First Session Setup (session 1 only — already complete for this project; kept here for reference and for a rebuild):
1. Create docs/. Move product-spec.md, access-matrix.md, user-stories.md and supabase-setup.md into it.
2. Install the brand skill: create .claude/skills/data-leaf-brand/ and place the provided SKILL.md and tokens.css there.
3. Copy questions.js, ecovadis.js and format.js (the portal's own files) into src/lib/ unchanged. Never edit them.
4. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL / Stage / Supabase project), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Refusal test record, Build decisions (one line each), Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · shadcn/ui · Netlify · Supabase (Auth + Postgres)
Deployment: GitHub → Netlify, auto-deploys from main. This is the dashboard's own repo and its own Netlify site, never the portal's. Netlify MCP is not active. The builder connects the repo and enters environment variables in the Netlify dashboard.

## Arms
Admin / User-Management — user-triggered (a button in the Admin Panel) — /netlify/functions/admin-actions.js — invite, deactivate/reactivate, reset password, reassign role or Admin. Uses the Supabase service role key, server-side only. Verifies on every call, itself, that the caller is authenticated and currently holds Admin — never trusts the UI hiding a button.

## Environment Variables
VITE_SUPABASE_URL — Supabase, Project Settings → API → Project URL — browser — public. Unchanged from v1.1.
VITE_SUPABASE_ANON_KEY — Supabase, Project Settings → API → anon/publishable key — browser — public. Unchanged from v1.1.
SUPABASE_SERVICE_ROLE_KEY — Supabase, Project Settings → API (copy button, never by mouse selection) — Netlify Functions only — SECRET. New this iteration; exists on the project already, simply unused until now. Never VITE_-prefixed, never in any committed file, never reaches the browser.
At session start, confirm .env.local exists (the VITE_ pair only — the service role key is never used by the local browser client) and prompt the builder if missing. Leave "Contains secret values" unticked for the VITE_ pair in Netlify; tick it for the service role key. After setting or changing any of these, run "Deploy project without cache."

## Supabase
Project: "The Corporate" (smnrfopzzzhazkehcqqn) — already exists. Project URL: https://smnrfopzzzhazkehcqqn.supabase.co
docs/supabase-setup.md is the schema source of truth. Read it before any database work. Never recreate tables or policies that already exist. Update it at every save point that touches the database, then tell the builder to copy it into the portal repo.
Plan: Free. Pauses after about a week without traffic, taking both tools down.

Existing tables (owned by the portal — read-only for this tool, never alter):
companies: id, legal_name, registered_country, contact_name, contact_title, contact_email, created_at, updated_at
submissions: id, company_id (FK → companies.id), path, door, answers (jsonb), attached_file_name, attached_file_size, signatory_name, declaration_date, submitted_at, status

Existing dashboard table (built in v1.1, unchanged):
submission_status_changes: id, submission_id (FK → submissions.id), from_status, to_status, reason, changed_by, changed_by_email, changed_at

New table this iteration — build via Supabase MCP, then document in docs/supabase-setup.md:
user_roles: id (uuid, pk, default gen_random_uuid()), auth_user_id (uuid, unique, FK → auth.users.id, set by the admin function at invite time), email (text), role (text, check in ehs|esg|procurement), is_admin (boolean, default false), is_active (boolean, default true), created_at (timestamptz, default now()), updated_at (timestamptz). A partial unique index on is_admin where is_admin = true enforces exactly one admin at any time; the admin function additionally refuses unsetting the only admin without setting a new one in the same transaction. No separate profiles table — this project keys directly off auth.users via user_roles.auth_user_id (docs/access-matrix.md §5), not the generic profiles pattern.

RLS — every rule below is lifted from docs/access-matrix.md; build none from memory.
companies: anon has no access (unchanged). authenticated may select all rows (unchanged). No writes.
submissions: anon may insert with status = 'new' only (unchanged). authenticated may select all rows (unchanged). No direct update or delete; status changes only through set_submission_status().
submission_status_changes: anon has no access (unchanged). authenticated may select all rows, including the review comment (unchanged). Written only by the trigger and set_submission_status().
user_roles: anon has no access. authenticated may select only their own row (auth_user_id = auth.uid()) — no policy exposes the full roster to anyone, Admin included. No authenticated insert, update or delete — every write goes only through the Netlify admin function using the service role key, which bypasses RLS by design after checking the caller currently holds is_admin = true.

set_submission_status(p_submission_id, p_new_status, p_reason) — updated this iteration. In addition to its existing v1.1 refusals (null auth.uid(), target other than accepted/needs_review, blank reason for needs_review, no-op, superseded row), it now also refuses unless the caller's user_roles row has role in (ehs, esg) and is_active = true.

Change password: a signed-in user changes their own password via Supabase Auth's updateUser(); nobody changes another's this way. A forgotten password is reset by the Admin through the Admin Panel (service role key, server-side) — never in the Supabase dashboard.

Auth: email and password, invite-only, unchanged. "Allow new users to sign up" stays OFF. What changes: the admin now invites, deactivates, resets, and reassigns from the in-app Admin Panel (Netlify Function, service role key) instead of the Supabase dashboard's Authentication → Users screen — the underlying admin-managed model is the same; only the door changed.

## Hard Rules
- API keys never in any frontend file or GitHub commit. VITE_ variables only for the browser-safe pair; SUPABASE_SERVICE_ROLE_KEY lives only in the Netlify Function's server-side environment and is never VITE_-prefixed.
- Netlify Identity: never. Supabase Auth is the only authentication system in this stack.
- RLS: never disabled on any table, including the new user_roles. If a query fails, fix the policy or the query.
- Function contract: set_submission_status() stays SECURITY DEFINER with a fixed search_path, execute granted to authenticated only, revoked from public and anon. The four admin actions are never implemented as a Postgres function — they run entirely inside the Netlify Function using the service role key, which is the rule for that path (RLS does not apply to it); it validates every input and checks the caller is authenticated and is_admin before touching anything.
- Refusal happens in the database, or in the Netlify Function that holds the service role key and checks every request itself — never only in the screen.
- Nobody changes their own role, is_admin, or is_active through the app — refused even via a direct call to the admin function. Another user's role, is_admin, or is_active is changed only by the current Admin, only through the Netlify Function using the service role key — never by a direct RLS policy from the browser.
- Exactly one is_admin = true row at all times. The current Admin cannot deactivate their own account or drop their own Admin status without naming a successor in the same action, in the UI and via a direct Function call.
- Deactivation is two things together: user_roles.is_active = false AND banning the person's Supabase Auth login via the Admin API, so an already-open session's next request also fails — not just a role check.
- Nothing is deleted through the app. No DELETE policy exists on companies, submissions, submission_status_changes, or user_roles. Deactivation is the only "removal" a team member ever undergoes.
- This tool shares a Supabase project with the Supplier Sustainability Portal. Protected objects: companies and submissions' existing columns, resolve_company() (stays revoked from authenticated), and the companies table's anon lockout. Make no changes to them beyond what's documented here. Never grant anything new to anon.
- Never change anything in the portal's repo, code, pages, fields, routes or submission flow.
- Status changes by hand happen only through set_submission_status(). Never add an update policy on submissions.
- No direct authenticated writes to user_roles — no insert/update/delete policy exists on it, by design.
- No supplier data, and no team roster, is fetched before login. A logged-out visitor sees only the Login view.
- Migrations: every schema, policy, trigger and function change goes through apply_migration with a descriptive name and is saved as a file in supabase/migrations/, committed with the save point. execute_sql is for reads and data fixes only.
- Every access rule comes from docs/access-matrix.md and is built with the mechanism its policy plan names (policy or function). If a rule is needed that the matrix doesn't state, stop and ask — never invent one.
- The access phase (schema, policies, the admin function, the Admin Panel, hiding Procurement's controls, the Change password screen) is built as one phase and does not deploy until the two-half refusal test passes: Claude Code tries every "no" cell and the "own" boundary through the API as each named person and logged out; then Isabela, Isa and isabel do the same on the screens.
- The Supabase client for this tool persists and refreshes the session (persistSession true, autoRefreshToken true). Do not copy the portal's client, which sets persistSession false.
- Complexity: build no rate limit, queue, retry, scan, monitor, or test suite. None is requested.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src
  /components
  /lib                ← Supabase client, questions.js, ecovadis.js, format.js, flag logic
/netlify/functions    ← admin-actions.js (new: the admin function)
/docs                 ← product-spec.md, access-matrix.md, user-stories.md, supabase-setup.md
/supabase/migrations  ← one .sql file per applied migration
/.claude/skills/data-leaf-brand/   ← brand skill (SKILL.md, tokens.css)
/public/assets
```

## Brand
Brand is governed by the data-leaf-brand skill at .claude/skills/data-leaf-brand/SKILL.md (installed in First Session Setup). Use its tokens.css for all colours and invoke it for any UI work, including the new Admin Panel.
Hard rules that hold even if the skill is not loaded:
- Background: Mint Cream #EEF4F0. Never white, never Tailwind gray defaults. Panels, table headers and the New badge use Silver #DAD9D9.
- Text and top bar: Deep Space Blue #0B3142. Deep Teal #37663E is used for Log in, Save status, the Accepted badge and section markers.
- Burnt Clay #B35634 is used for the Needs review badge, raised flag indicators, links and error messages. Never use Tailwind blue defaults.
- DM Sans 500 for headings and figures, Inter 400 for body, tables and labels. No dark mode, no emoji, no exclamation points.

## Business Rules
- A submission is current when its status is not 'superseded'. Overview, pie chart, register and flag board use current submissions only.
- Overview: Total = current submissions, EcoVadis = path 'ecovadis', Questionnaire = path 'full'. Total always equals EcoVadis + Questionnaire.
- Status: every row arrives as 'new'. By hand, statuses go new → accepted/needs_review, accepted → needs_review, needs_review → accepted. A reason is required only for needs_review. 'superseded' is set only by the trigger and is permanently locked for everyone, Admin included.
- Superseding is same route only, and automatic via the trigger. There is no free edit and no by-hand override.
- Risk flags (Cautious rule, unchanged from v1.1): compare answers trimmed and case-insensitive; a blank or missing answer is unanswered; see docs/product-spec.md §9.3 for the full per-question table. Flag count is a plain 0–7 count, no weighting.
- A company with no current Questionnaire submission shows "Not assessable via questionnaire", sorts after assessable rows, and is hidden under any single-flag filter.
- role in (ehs, esg) and is_active = true → can set review status and write the review comment; role = procurement, or any role with is_active = false → view-only everywhere, no controls rendered, the function refuses if called directly.
- is_admin = true → sees and may use the Admin Panel, in addition to whatever role otherwise permits.
- A role or Admin reassignment takes effect on the person's very next action — no need to log out and back in, since the check is a live read against user_roles, never baked into a token.
- The top bar shows the logged-in user's email and role (e.g. "isabela@gmail.com · EHS").
- Contact details are the company's latest on file. Show the spec's caveat note on the detail page.
- Confirmation messages are worded exactly as in the spec: "Email or password not recognised.", "Status not saved. Nothing was changed. Try again.", "This submission has been superseded and is locked."

Out of scope — do not build:
- Roles or permissions beyond EHS, ESG, Procurement, and the Admin capability as specified
- Any change to the supplier portal
- Messaging or notifying suppliers, and supplier-facing status
- CSV or PDF export
- AI features and scheduled automation
- Weighting, scoring or grading of risk flags
- In-app "forgot password" self-service reset, and automatic email on invite or password reset
- An audit log of admin actions themselves, beyond user_roles' current state
- More than one simultaneous Admin, or a fourth dedicated Admin role
- Editing supplier answers or identity, and deleting submissions, companies, or user_roles rows (deactivate only, never delete)
- Viewing or downloading attached files, and per-submission historical contact details

## Reference Docs
Read before building the related part:
- docs/product-spec.md — views, logic, edge cases and the 34 acceptance criteria
- docs/access-matrix.md — read before writing any RLS or touching a policy; every policy is built from it (full form: roles, ownership, the policy plan)
- docs/user-stories.md — read before changing a screen or a role; every acceptance line is a test
- docs/supabase-setup.md — schema source of truth (exists — read first)
- .claude/skills/data-leaf-brand/SKILL.md — full brand system and tokens.css
- src/lib/questions.js, ecovadis.js, format.js — portal data files, copied unchanged
PROGRESS.md in the root is read at every session start per the Session Protocol.
