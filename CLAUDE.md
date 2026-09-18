# The Corporate Supplier Review Dashboard 2026

## Identity
An internal dashboard where a small invited team at The Corporate reviews every supplier submission the portal has saved, sees risk flags, and sets a review status. Access is by email and password login.
Tier: 3. Data is persisted in Supabase, login is required, and every logged-in user has the same permissions (D3+A2).
Spec version governed: v1.1, the version of docs/product-spec.md these rules were derived from.
Position: Tool B of 2 in The Corporate stack. It shares the Supabase project with The Corporate Supplier Sustainability Portal 2026 (Tool A, live at https://the-corporate-sep.netlify.app) and builds on the portal's existing schema.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md. If its version is newer than the "Spec version governed" line in this file, STOP. Tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it." Do not build against a stale CLAUDE.md.
3. Read PROGRESS.md in the project root. It is the current state of this build. If it is missing, recreate it with the structure at the end of this section, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content, repeat the notes back to the builder, treat them as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work.

Save point: after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table, column, policy, function, trigger, or auth change), update docs/supabase-setup.md in the same save point.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one. An ending session is a save point.

First Session Setup (session 1 only):
1. Create docs/. Move product-spec.md and supabase-setup.md into it.
2. Install the brand skill: create .claude/skills/data-leaf-brand/ and place the provided SKILL.md and tokens.css there.
3. Copy questions.js, ecovadis.js and format.js (the portal's own files) into src/lib/ unchanged. Never edit them. They are the source of question IDs, text, options, sections, EcoVadis labels and date/size formatting.
4. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Build decisions (one line each), Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · shadcn/ui · Netlify · Supabase (Auth + Postgres)
Deployment: GitHub → Netlify, auto-deploys from main. This is the dashboard's own repo and its own Netlify site, never the portal's. Netlify MCP is not active. The builder connects the repo and enters environment variables in the Netlify dashboard. Remind them before the first deploy.

## Environment Variables
VITE_SUPABASE_URL: Supabase, Project Settings → API → Project URL. Netlify env var and .env.local.
VITE_SUPABASE_ANON_KEY: Supabase, Project Settings → API → anon / publishable key. Netlify env var and .env.local.
These are the same values the portal uses. Carry-over lessons from the portal build:
- Copy the key with the Supabase copy button, never by mouse selection. A truncated key containing "…" breaks supabase-js before any request is sent.
- Leave "Contains secret values" unticked.
- VITE_ values are inlined at build time, so after setting or changing them run "Deploy project without cache".
At session start, confirm .env.local exists and prompt the builder if it is missing. No value ever appears in code or in any committed file. .env and .env.* are gitignored (.env.example excepted).

## Supabase
Project: "The Corporate" (smnrfopzzzhazkehcqqn) already exists. Project URL: https://smnrfopzzzhazkehcqqn.supabase.co
docs/supabase-setup.md is the schema source of truth. Read it before any database work. Never recreate tables or policies that already exist. Update it at every save point that touches the database.
Plan: Free. It pauses after about 1 week without traffic, and a pause takes down both tools.

Existing tables this tool reads (the portal owns these columns, so never alter them):
companies: id, legal_name, registered_country, contact_name, contact_title, contact_email, created_at, updated_at
submissions: id, company_id (FK → companies.id), path ('ecovadis' | 'full'), door, answers (jsonb), attached_file_name, attached_file_size, signatory_name, declaration_date, submitted_at

Build via Supabase MCP (spec Section 5, rules 1–5), then document in docs/supabase-setup.md:
- submissions.status: text, default 'new', check-constrained to 'new' | 'accepted' | 'needs_review' | 'superseded'. Include the one-time backfill in the same migration: the newest row per (company_id, path) by submitted_at stays 'new', and older rows become 'superseded' with automatic log entries.
- Tighten the existing policy "anon may insert a submission" to with check (status = 'new'). Keep the same name and role.
- New table submission_status_changes: id (uuid), submission_id (FK → submissions.id, on delete cascade), from_status, to_status, reason (nullable), changed_by (uuid, nullable), changed_by_email (nullable), changed_at (default now()).
- AFTER INSERT trigger on submissions (SECURITY DEFINER, search_path = public, pg_temp). It supersedes every other non-superseded row with the same company_id and path, and logs each change with changed_by and changed_by_email null and reason "Automatic — newer submission received". It must never raise on ordinary cases, because a failing trigger shows suppliers the portal's save-failure notice.
- public.set_submission_status(p_submission_id, p_new_status, p_reason): SECURITY DEFINER. Execute is granted to authenticated only and revoked from public and anon. It refuses when auth.uid() is null, when the row is superseded, for any target other than accepted or needs_review, for needs_review with a blank reason, and for a no-op change. It updates status and writes the log row in one transaction, taking the caller's id and email from the session, never from a parameter.
RLS (on every table, always):
- companies: anon has no access (unchanged). authenticated may select all rows. There are no writes.
- submissions: anon may insert with status = 'new' only. authenticated may select all rows. There is no direct update or delete.
- submission_status_changes: anon has no access. authenticated may select all rows. It is written only by the trigger and set_submission_status().
Auth: email and password, invite-only. The builder adds users in Authentication → Users. "Allow new users to sign up" must be OFF at the Supabase level. Confirm this with the builder before deploying.
When updating docs/supabase-setup.md, explain why the authenticated select policy on companies is compatible with the portal's "no select policy on companies" rule: that rule protects against anon, and anon still gets nothing.

## Hard Rules
- API keys never in any frontend file or GitHub commit. This tool has no server functions and uses only the two VITE_ variables above.
- Netlify Identity: never. Supabase Auth is the only authentication system in this stack.
- RLS: never disabled on any table. If a query fails, fix the policy or the query. Never disable RLS to work around it.
- Supabase service role key: not used by this tool. It never appears in a VITE_ variable, a committed file, or the frontend.
- This tool shares a Supabase project with the Supplier Sustainability Portal. Protected objects: the existing columns of companies and submissions, resolve_company() (stays revoked from authenticated), and the companies table's anon lockout. Make no changes to them beyond the Section 5 additions above. Never grant anything new to anon.
- Never change anything in the portal's repo, code, pages, fields, routes or submission flow.
- Status changes by hand happen only through set_submission_status(). Never add an update policy on submissions.
- No supplier data is fetched before login. A logged-out visitor on any URL sees only the Login view.
- The Supabase client for this tool persists and refreshes the session. Do not copy the portal's client, which has persistSession false.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src
  /components
  /lib                ← Supabase client, questions.js, ecovadis.js, format.js, flag logic
/docs                 ← product-spec.md, supabase-setup.md
/.claude/skills/data-leaf-brand/   ← brand skill (SKILL.md, tokens.css)
/public/assets
```

## Brand
Brand is governed by the data-leaf-brand skill at .claude/skills/data-leaf-brand/SKILL.md (installed in First Session Setup). Use its tokens.css for all colours and invoke it for any UI work.
Hard rules that hold even if the skill is not loaded:
- Background: Mint Cream #EEF4F0. Never white, never Tailwind gray defaults. Panels, table headers and the New badge use Silver #DAD9D9.
- Text and top bar: Deep Space Blue #0B3142. Deep Teal #37663E is used for Log in, Save status, the Accepted badge and section markers. This follows the spec and overrides the skill's default of Burnt Clay for primary buttons.
- Burnt Clay #B35634 is used for the Needs review badge, raised flag indicators, links and error messages. Never use Tailwind blue defaults.
- DM Sans 500 for headings and figures, Inter 400 for body, tables and labels. No dark mode, no emoji, no exclamation points.

## Business Rules
- A submission is current when its status is not 'superseded'. Overview, pie chart, register and flag board use current submissions only.
- Overview: Total = current submissions, EcoVadis = path 'ecovadis', Questionnaire = path 'full'. Total always equals EcoVadis + Questionnaire.
- Status: every row arrives as 'new'. By hand, statuses go new → accepted/needs_review, accepted → needs_review, and needs_review → accepted. A reason is required only for needs_review. 'superseded' is set only by the trigger and is permanently locked.
- Superseding is same route only. A submission on a different route never supersedes anything.
- Risk flags (spec 9.3, Cautious rule): compare answers trimmed and case-insensitive. A blank or missing answer is unanswered. A flag is Not raised only on the answers listed below. Any other non-blank value raises the flag.
  - PFAS in use (S3-2): No
  - No SBTi target (S2-5): Yes — validated · Yes
  - High water stress (S4-3): No
  - Near protected area (S6-1): No
  - No human rights policy (S7-1): Yes
  - No supply-chain HR due diligence (S7-2): Yes — both tiers · Yes
  - No conflict minerals policy (S7-4): Yes · Not applicable to our products
- Flag count (0–7) is a plain count with no weighting, scoring or colour grading. Unanswered count (0–7) is shown separately.
- A company with no current Questionnaire submission shows "Not assessable via questionnaire", never 0. It always sorts after assessable rows and is hidden under any single-flag filter. Ties sort by company name A–Z.
- EcoVadis answers are keyed Q1–Q9 (labels from ecovadis.js). The upload door carries Q1, Q2 and Q3 only. Questionnaire notes are stored under the key `<id>__notes`.
- Question text on the detail page comes from GUIDED_FIELDS[].label, never the workbook's templateText.
- Door labels: ecovadis_upload is "EcoVadis — scorecard upload", ecovadis_form is "EcoVadis — form", assessment_guided is "Questionnaire — guided form", and assessment_upload is "Questionnaire — workbook upload".
- Contact details are the company's latest on file. Show the spec's caveat note on the detail page.
- The confirmation messages are worded exactly as in the spec: "Email or password not recognised.", "Status not saved. Nothing was changed. Try again.", "This submission has been superseded and is locked."

Out of scope — do not build:
- Roles or user levels, or any role column, role check or role-based UI
- Any change to the supplier portal
- Messaging or notifying suppliers, and supplier-facing status
- CSV or PDF export
- AI features and scheduled automation
- Weighting, scoring or grading of risk flags
- Self-signup, and in-app forgot-password or password reset
- Editing supplier answers or identity, and deleting submissions or companies
- Viewing or downloading attached files, and per-submission historical contact details

## Reference Docs
Read before building the related part:
- docs/product-spec.md: views, logic, edge cases and the 22 acceptance criteria
- docs/supabase-setup.md: schema source of truth (exists, so read it first)
- .claude/skills/data-leaf-brand/SKILL.md: full brand system and tokens.css
- src/lib/questions.js, ecovadis.js, format.js: portal data files, copied unchanged
PROGRESS.md in the root is read at every session start per the Session Protocol.
