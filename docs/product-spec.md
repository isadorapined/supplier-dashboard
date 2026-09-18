# Product Spec — The Corporate Supplier Review Dashboard 2026

**Version:** 1.1
**Date:** 18 September 2026
**Author:** Isadora Pineda Stanischeski
**Status:** Confirmed

> This is the second tool in a stack. The first tool, The Corporate Supplier Sustainability Portal 2026 (spec v3.0), is built, live, and owns the schema. This dashboard joins the same Supabase project. **Nothing in the supplier portal's code, pages, fields, routes, submission flow, workbook or capture screens changes.** The only effects on the portal are the database additions listed in Section 5, which the portal never reads.

---

## Section 1 — Tool Summary

**Tool name:** The Corporate Supplier Review Dashboard 2026

**What it does:** An internal, login-protected dashboard that shows every supplier submission the portal has saved. It has three sections: an overview with headline numbers, a risk flag board built from seven Yes/No questionnaire answers, and a searchable supplier register with a full detail page per submission. The team can set a review status on each submission, and every status change is recorded.

**Who uses it:** A small, named group at The Corporate, led by the ESG lead. Everyone logs in with email and password, and everyone has the same permissions. Accounts are created by the builder in Supabase, and nobody can sign themselves up.

**Why it exists:** Today the ESG lead has to open the Supabase table editor and read raw JSON to see anything a supplier submitted. This dashboard replaces that with readable screens, surfaces risk at a glance, and gives the team a recorded review status per submission. The team uses that status to decide which suppliers to contact. Contacting suppliers happens outside the tool.

**Build status:** First build. This is a new tool, not an iteration of the portal. The portal (v3.0) is Tier 2, public, no login, and writes to `companies` and `submissions`. This dashboard reads those tables, adds a status column, a status change log and an automatic superseding rule, and adds login for a small internal team.

---

## Section 2 — Classification

### Data Model

**Decision:** D3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| D1 — Hardcoded | All data is written into the code by the developer. Users cannot input anything that persists. The tool displays what the developer put in. | No |
| D2 — Session | Data enters the tool during use and disappears when the tab closes. No database. Covers both uploaded files and form inputs. | No |
| D3 — Persisted | Data is written to a database and survives after the session ends. Supabase is required. | Yes |

**Reason:** The dashboard reads submissions persisted by the portal, and it writes review statuses and a status change log that must survive and be visible to every team member. Login also requires a database (promotion rule).

**D3 is triggered if any of the following are true — check all that apply:**
- [x] Data must be retrievable after the session ends
- [x] Multiple sessions contribute to the same dataset
- [x] An audit trail or history is needed
- [x] Data submitted by one person must be visible to another
- [ ] Results must be accessible via a URL after the session ends
- [ ] Files uploaded by users must be stored and retrievable later

---

### Access Model

**Decision:** A2

| Label | What it means | This tool? |
|-------|--------------|-----------|
| A1 — Public | Anyone with the URL can use it. No login, no account required. | No |
| A2 — Authentication | Users must log in. All logged-in users see the same thing and have the same permissions. | Yes |
| A3 — Authorization | Users must log in and have different roles. Different roles see different data or have different permissions. | No |

**Reason:** Only a small named group at The Corporate may see supplier data, and every member of that group sees and does exactly the same things.

> **Promotion rule:** Auth requires a database. If the access model is A2 or A3, the data model is D3 — even when all displayed content is fixed. D1/D2 combined with A2/A3 are not valid classifications; they resolve to D3.

---

### If Access Model is A2 — complete both questions

**Auth reason:** Controlled access — only a specific, defined list of people may use this tool.

**Signup model:** Invite-only — the builder creates each user in the Supabase dashboard. Public signup is switched off at the Supabase Auth level, not merely hidden in the UI.

> **Why signup must be off at the Supabase level:** the anon key is public (it ships in both tools' JavaScript bundles). If Supabase Auth allowed signups, anyone holding that key could create an account, become `authenticated`, and read every supplier's data through the policies in Section 6. Disabling signup in Supabase is what makes "authenticated" mean "invited by the builder."

---

### If Access Model is A3 — define all roles

N/A — this tool is A2. Roles are explicitly deferred (see Section 12).

---

### Tier

**Tier:** 3

| Tier | D+A combination | Stack | Deployment |
|------|----------------|-------|------------|
| 1 | D1+A1 or D2+A1 | Netlify only | Netlify |
| 2 | D3+A1 | Netlify + Supabase (no auth) | Netlify |
| 3 | D3+A2 or D3+A3 | Netlify + Supabase (auth + RLS) | Netlify |

---

### Standalone or Stack

**This tool is:** Part of a stack — see Section 4.

---

## Section 3 — Arms

Arms are capabilities added to the tool. They do not change the tier.

> **Document search and AI knowledge bases are outside this framework version.** Not requested for this tool.

---

### AI API Arm

**Active:** No

---

### Export Arm

**Active:** No. On-screen viewing only. No CSV or PDF download of any kind.

---

### Email Arm

**Active:** No. The dashboard sends no email. Communication with suppliers about a "Needs review" status happens outside the tool.

---

### Scheduled Automation Arm

**Active:** No. The automatic superseding rule (Section 9.2) is a database trigger that fires when the portal saves a submission. It is not a scheduled job.

---

## Section 4 — Stack and Deployment

### All Tiers

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind CSS + shadcn/ui (same stack as the portal) |
| Deployment target | Netlify — its own site, separate from the portal's `the-corporate-sep` site |
| Netlify MCP | Not active — deployment will be done manually through the Netlify dashboard. |

**GitHub — pre-build requirement for all Tier 1, 2, and 3 tools:**
The user creates the GitHub repo before the first Claude Code session. The product-spec.md, CLAUDE.md, and PROGRESS.md must be uploaded to the repo root before Claude Code opens. Claude Code assumes the repo exists, commits changes regularly, and pushes to main. It does not create or configure the repo.

This dashboard gets its **own new repo**. It must not be built inside the portal's repo.

---

### CONDITIONAL: Supabase project — only complete if Tier 2 or Tier 3

**Supabase project status:** Existing — a project already exists for this context.

**Supabase plan:** Free — pauses after roughly one week of no traffic. Confirmed by the builder for this class/portfolio build. **A pause affects both tools at once**: the portal refuses supplier submissions and the dashboard's login fails until the project is restored in the Supabase dashboard.

**If existing:**

| Detail | Answer |
|--------|--------|
| Project name | The Corporate |
| Project ID | `smnrfopzzzhazkehcqqn` (URL `https://smnrfopzzzhazkehcqqn.supabase.co`, us-east-1, Postgres 17.6) |
| supabase-setup.md location | docs/supabase-setup.md in the project folder — copied from the portal repo's `docs/supabase-setup.md` (last updated 11 September 2026, session 3) |

> Claude Code will read supabase-setup.md before making any schema changes. It will not recreate tables or policies that already exist.

**supabase-setup.md — all Tier 2 and Tier 3 tools:**
This file is created by Claude Code at the end of the first build session and updated every time Claude Code touches the database. It lives permanently in docs/ and records the project name, project ID, all tables and fields, RLS policies, and auth configuration. It is the schema source of truth for all future build sessions and for the Supabase QA skill.

> **Two copies, one database.** Both repos carry a `docs/supabase-setup.md` describing the same project. After this build changes the schema, the dashboard's copy becomes the newer one. The builder must copy it back into the portal repo's `docs/`, so the portal's future sessions do not work from a stale schema. See Section 15.

---

### CONDITIONAL: Only complete if this tool is part of a stack

**Stack name / Supabase project name:** The Corporate

**This tool's role in the stack:** Tool B — internal review dashboard

**Other tools in this stack:**

| Tool | Tier | Role in the stack |
|------|------|------------------|
| The Corporate Supplier Sustainability Portal 2026 (Tool A) | Tier 2 | Public, no-login submission portal. Created the schema. Writes to `companies` (via `resolve_company()`) and `submissions`. Live at https://the-corporate-sep.netlify.app. |
| The Corporate Supplier Review Dashboard 2026 (Tool B — this tool) | Tier 3 | Internal, login-protected review dashboard. Reads both tables; adds and writes review status and the status change log. |

> **Build order:** the tool that creates the schema builds first (usually the public/submission side) — its spec marks the Supabase project as new. Every other tool in the stack marks the project as existing, and their build sessions must not start until the first build is complete and docs/supabase-setup.md exists. Each tool gets its own spec, its own repo, its own CLAUDE.md, and its own Netlify site — the shared Supabase project is the only thing connecting them.

**Build order status:** satisfied. Tool A is built and live, and docs/supabase-setup.md exists.

---

## Section 5 — Data Architecture

### CONDITIONAL: Only complete if Data Model is D3

**Existing data the dashboard reads (owned by the portal — do not alter these columns):**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| `companies.legal_name` | Company legal name | Text | Supplier, via portal | Yes |
| `companies.registered_country` | Registered country | Text | Supplier, via portal | Yes |
| `companies.contact_name` | Primary contact name | Text | Supplier, via portal | Yes |
| `companies.contact_title` | Primary contact title | Text | Supplier, via portal | Yes |
| `companies.contact_email` | Primary contact email | Email | Supplier, via portal | Yes |
| `submissions.company_id` | Which company the submission belongs to | UUID (FK) | Automatic | Yes |
| `submissions.path` | Route: `ecovadis` → shown as **EcoVadis**; `full` → shown as **Questionnaire** | Text | Supplier's path choice | Yes |
| `submissions.door` | `ecovadis_upload`, `ecovadis_form`, `assessment_guided`, `assessment_upload` | Text | Supplier's door choice | Yes |
| `submissions.answers` | All door-specific answers, keyed by question ID; notes stored as `<id>__notes` | JSON | Supplier | Yes |
| `submissions.attached_file_name` / `attached_file_size` | Attached file name and size (bytes) | Text / Integer, nullable | Automatic | No |
| `submissions.signatory_name` / `declaration_date` | Declaration signatory and date | Text / Date, nullable | Supplier (Questionnaire route only) | No |
| `submissions.submitted_at` | Submission date | Timestamp | Automatic | Yes |

**New data this build adds:**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| `submissions.status` | Review status: `new`, `accepted`, `needs_review`, `superseded` | Text, check-constrained to those four values, default `new` | Automatic (`new` on arrival, `superseded` by trigger); team (`accepted`, `needs_review`) | Yes |
| `submission_status_changes.id` | Log entry ID | UUID (auto) | Automatic | Yes |
| `submission_status_changes.submission_id` | Which submission changed | UUID (FK → submissions.id, on delete cascade) | Automatic | Yes |
| `submission_status_changes.from_status` | Status before the change | Text | Automatic | Yes |
| `submission_status_changes.to_status` | Status after the change | Text | Automatic | Yes |
| `submission_status_changes.reason` | Short written reason | Text, nullable | Team member — required when `to_status` is `needs_review` | Conditionally |
| `submission_status_changes.changed_by` | Auth user ID of the person who changed it | UUID, nullable (null = automatic change) | Automatic, from the logged-in session | No |
| `submission_status_changes.changed_by_email` | Email of the person who changed it, stored at change time | Text, nullable (null = automatic change) | Automatic, from the logged-in session | No |
| `submission_status_changes.changed_at` | When it changed | Timestamp, default `now()` | Automatic | Yes |

**Tables needed:**

| Table name | What it stores | Key fields |
|-----------|---------------|-----------|
| `companies` | *Existing, unchanged.* One row per supplier company. | legal_name, contact_email |
| `submissions` | *Existing.* One row per submission. **Gains one column: `status`.** | company_id, path, status, submitted_at |
| `submission_status_changes` | *New.* One row per status change, manual or automatic. Never updated or deleted by any user. | submission_id, to_status, changed_by_email, changed_at |

**Database logic this build adds (Claude Code builds via MCP):**

1. **Status column.** Add `submissions.status` with default `new` and a check constraint on the four values. The portal's insert does not send `status`, so every new portal submission arrives as `new` with no portal code change.
2. **Tighten the portal's insert policy.** The existing anon insert policy on `submissions` has `with check (true)`. Without a change, anyone with the public key could insert a submission pre-set to `accepted`. Replace the check with `status = 'new'`, keeping the same policy name and role. The portal never sends `status`, so its behaviour is unaffected. This must be verified by a live portal submission afterwards (acceptance criterion 18).
3. **Automatic superseding trigger.** An `AFTER INSERT` trigger on `submissions`, with a `SECURITY DEFINER` function. When a new row is saved, every other row with the same `company_id` and the same `path` whose status is not already `superseded` is set to `superseded`. One log entry is written per row changed, with `changed_by` and `changed_by_email` null and reason `Automatic — newer submission received`. The function sets `search_path = public, pg_temp`. It must never raise an error for ordinary cases, because a failing trigger would make the portal show suppliers the save-failure notice.
4. **Status change function.** `public.set_submission_status(p_submission_id uuid, p_new_status text, p_reason text)`, `SECURITY DEFINER`, execute granted to `authenticated` only and revoked from `public` and `anon`. It must:
   - refuse if `auth.uid()` is null;
   - refuse if the submission is `superseded`;
   - refuse any target other than `accepted` or `needs_review`;
   - refuse `needs_review` with an empty or whitespace-only reason;
   - refuse a no-op change (same status).
   
   When the change is allowed, it updates `status` and writes the log row, including the caller's id and email taken from the auth session and never from a parameter, in one transaction. This is the **only** way a status changes by hand.
5. **One-time backfill** (runs once, in the migration that adds the status column):
   - For each (`company_id`, `path`) pair, the most recent row by `submitted_at` stays `new`.
   - All older rows in that pair become `superseded`, with automatic log entries as in rule 3.

**File storage:** No. The dashboard displays only the filename and size the portal recorded. No file was ever stored and none is retrievable.

**Derived or calculated data:** Yes. All of the following are calculated in the browser and never stored:
- **Current submission:** a submission whose status is not `superseded`.
- The overview counts.
- The pie chart split.
- Each company's flag count and unanswered count.
- The flag board and register sort orders.

See Section 9 for the exact rules.

---

## Section 6 — Access and Permissions

### CONDITIONAL: Only complete if Access Model is A2 or A3

**Auth configuration:**

| Detail | Answer |
|--------|--------|
| Authentication method | Email and password. The builder explicitly chose this over the magic link the architect would normally recommend for an invite-only internal tool. The login field is labelled "Email" — the email is the username. |
| Signup model | Invite-only — builder creates each user in the Supabase dashboard (Authentication → Users → Add user). "Allow new users to sign up" is switched **off** in Supabase Auth settings. Claude Code must confirm with the builder that it is off before deployment. |

> **Privacy note:** User accounts store email addresses. For internal and client tools this falls under the organization's existing privacy framework rather than a consent flow.

**RLS rules — who can read and write what:**

RLS stays enabled on every table, and is never disabled.

> **Read this against the portal's rules before building.** The portal's CLAUDE.md and supabase-setup.md say "never add a select policy to `companies`." That rule protects supplier contact details from the **anon** key. The policies below grant read access to the **authenticated** role only. The anon role still gets nothing from `companies`. This is the reason the dashboard exists, and it is safe only because signup is disabled (Section 2). No policy in this build may grant anything new to `anon`. `resolve_company()` stays revoked from `authenticated`, as it is today.

| Table | User type | Can read | Can insert | Can update | Can delete |
|-------|----------|----------|------------|------------|------------|
| `companies` | Unauthenticated (anon) | No *(unchanged)* | No *(unchanged — only via `resolve_company()`)* | No | No |
| `companies` | Authenticated user | All rows | No | No | No |
| `submissions` | Unauthenticated (anon) | No *(unchanged)* | Yes — only with `status = 'new'` *(tightened, Section 5 rule 2)* | No | No |
| `submissions` | Authenticated user | All rows | No | No — status changes only through `set_submission_status()` | No |
| `submission_status_changes` | Unauthenticated (anon) | No | No | No | No |
| `submission_status_changes` | Authenticated user | All rows | No — written only by `set_submission_status()` and the superseding trigger | No | No |

The dashboard reads with the logged-in user's session through the anon/publishable key. The service role key is never used by this tool.

---

## Section 7 — GDPR

### MANDATORY DECISION: Complete this section for every D3 tool.

**GDPR outcome:** Not applicable. The builder confirmed during the interview that this tool collects no personal data through forms or uploads. It displays supplier contact data that the portal already collected. The portal's own GDPR outcome is also "not applicable, confirmed class/portfolio project." The only data the dashboard writes is:
- review statuses and reasons;
- the email of the team member who made each change;
- invite-only login accounts, which are covered by the Section 6 privacy note.

---

## Section 8 — Screen and UI Structure

Single-page app. Two top-level states: logged out (Login) and logged in (Dashboard). The supplier detail page opens inside the logged-in app and returns to the dashboard.

### View 1 — Login

- **Purpose:** Keep everything behind a login.
- **What is visible:** Data Leaf wordmark, the heading "Supplier Review Dashboard", an Email field, a Password field and a "Log in" button. No sign-up link and no "forgot password" link.
- **User actions:** Enter email and password, then log in.
- **What happens next:**
  - **Success:** opens View 2.
  - **Failure:** a single plain message "Email or password not recognised." in Burnt Clay. The message is the same whichever field was wrong.
  - **Direct visits:** a logged-out visitor who reaches any other URL or view is shown this view. No supplier data is fetched before login.

### View 2 — Dashboard (one scrolling page, three sections in this order)

A persistent top bar shows the tool name, the logged-in user's email and a "Log out" control. It also has anchor links to the three sections: Overview, Risk Flags and Register.

**Section A — Overview**
- **Purpose:** Show the state of the programme at a glance.
- **What is visible:**
  - Three summary figures, all counting **current** submissions:
    - Total submissions
    - EcoVadis submissions
    - Questionnaire submissions
  - One pie chart, "Submissions by route", with two slices (EcoVadis vs Questionnaire). Each slice is labelled with its count and percentage.
  - With zero current submissions, the figures show 0 and the chart area shows "No submissions yet."
- **User actions:** None. Display only.

**Section B — Risk Flag Board**
- **Purpose:** Show which suppliers raise questionnaire risk flags.
- **What is visible:** A table with **one row per company that has any current submission**. Columns:
  - Company
  - Flag count (0–7)
  - Unanswered (0–7)
  - Seven compact flag indicators, one per rule in Section 9.3, each showing raised / not raised / unanswered
  - Date of the questionnaire submission used
  
  A company with no current Questionnaire submission shows the text **"Not assessable via questionnaire"** across the count columns, never a 0.
  - Above the table: a single-select filter with the options "All suppliers" and one option per flag, labelled as in Section 9.3. A count of rows shown sits next to the filter.
- **User actions:**
  - Sort by flag count (default: highest first) or by company name.
  - Filter by one flag. The filter shows only companies with that flag raised, which excludes not-assessable rows.
- **What happens next:** The table re-sorts or re-filters in place. There is no scoring, weighting, ranking label or colour grading beyond the raised indicator.

**Section C — Supplier Register**
- **Purpose:** List and find every current submission.
- **What is visible:**
  - A table of current submissions only. Columns: Company, Contact name, Route (EcoVadis / Questionnaire), Status (New / Accepted / Needs review), Date submitted.
  - A company with a current submission on both routes appears in two rows.
  - A search box above the table: "Search by company name".
- **User actions:**
  - Sort by any column. The default is Date submitted, newest first.
  - Type in the search box. It filters as you type, is case-insensitive, and matches part of the legal name.
  - Click a row to open View 3 for that submission.
- **What happens next:** Opens View 3. When there are no results, the table shows "No suppliers match that search."

### View 3 — Supplier Detail

- **Purpose:** Show one submission in full, set its status, and see its history.
- **What is visible, top to bottom:**
  1. "Back to register" control, company legal name as heading, route and door (plain language, e.g. "Questionnaire — guided form"), status badge.
  2. **Identity**: company legal name, registered country, contact name, contact title, contact email, and submission date.
     > Caveat to show as a small note: the portal overwrites a company's contact details on every new submission. The contact shown is therefore the company's latest contact on file, which may differ from the contact at the time an older submission was made. Contact details are not stored per submission.
  3. **Submission content**. What appears depends on route and door:
     - **EcoVadis, upload door (`ecovadis_upload`):** attached file name and size (the file itself was never stored), publication date (`Q1`), valid until (`Q2`) and overall EcoVadis score (`Q3`), labelled as in the portal's `src/lib/ecovadis.js`.
     - **EcoVadis, form door (`ecovadis_form`):** all nine answers Q1–Q9, each with its question label from the portal's `src/lib/ecovadis.js`.
     - **Questionnaire (either door):** all 28 S2–S7 questions, grouped under section headings with their ESRS references:
       - S2 Climate & Decarbonisation (E1)
       - S3 Pollution & PFAS (E2)
       - S4 Water & Marine Resources (E3)
       - S5 Circular Economy & Waste (E5)
       - S6 Biodiversity & Ecosystems (E4)
       - S7 Social, Labour & Governance (S2 · G1)
       
       Each question shows the question text (the corrected guided-form wording, `GUIDED_FIELDS[].label`, never the raw workbook `templateText`), the answer, and its notes/evidence when present. A blank answer shows "Not answered". The seven flag questions show a raised indicator when their flag rule is met. Below the questions: the signatory name, the declaration date, and (upload door only) the attached file name and size.
  4. **Status panel.**
     - **If not superseded:**
       - A choice of Accepted or Needs review.
       - A "Reason" text field. It is required when Needs review is chosen and optional for Accepted.
       - A "Save status" button.
       - The button is disabled until a different status is chosen and, for Needs review, a non-blank reason is entered.
     - **If superseded:** no control. The panel shows "Superseded by a newer [route] submission on [date]. This submission is locked."
  5. **Status history.** A timeline of every entry in `submission_status_changes` for this submission, newest first. Each entry shows the date and time, "from → to", the reason, and who made it (their email, or "Automatic" for trigger entries). The first line of the timeline is always "Received — [submitted_at]".
  6. **Other submissions from this company.** A list of every other submission for this `company_id`, from both routes and including superseded ones. Each entry shows route, door, date submitted and status. Clicking one opens its own View 3. It is hidden when there are none.
- **User actions:** Set a status and save, open another submission from the history, or go back to the register.
- **What happens next:**
  - **On save:** calls `set_submission_status()`. On success, the badge, the status panel, the timeline and the register row all update, with no page reload needed.
  - **On failure:** a plain Burnt Clay message "Status not saved. Nothing was changed. Try again." The chosen status and reason stay on screen.
  - **Superseded while open:** if the submission was superseded after the page was opened, the refusal message reads "This submission has been superseded and is locked." and the view refreshes.

---

## Section 9 — Logic and Calculations

### 9.1 — Current submission

**What is calculated:** Which submissions are "current".

**Rule:** A submission is current if its `status` is not `superseded`. The superseding trigger (Section 5, rule 3) guarantees there is at most one current submission per company per route. A company can therefore have zero, one or two current submissions: at most one EcoVadis and one Questionnaire.

**Where it is used:**
- Overview counts: current submissions only.
- Pie chart: current submissions only.
- Register rows: current submissions only.
- Flag board: each company's current Questionnaire submission.

Superseded submissions appear only in View 3's "Other submissions" list.

### 9.2 — Status rules

| From | Allowed next status | How | Reason required? |
|------|--------------------|-----|------------------|
| (new row) | `new` | Automatic, on insert | — |
| `new` | `accepted` / `needs_review` | By hand, View 3 | Only for `needs_review` |
| `accepted` | `needs_review` | By hand | Yes |
| `needs_review` | `accepted` | By hand | No (optional) |
| any except `superseded` | `superseded` | Automatic only, when the same company submits again through the **same route** | Logged as "Automatic — newer submission received" |
| `superseded` | nothing | Locked permanently | — |

Nobody can set `new` or `superseded` by hand. A submission through a **different** route never supersedes anything. An EcoVadis submission and a Questionnaire submission from the same company are both current at the same time.

The intended loop is:
1. The team sets "Needs review" and contacts the supplier outside the tool.
2. The supplier resubmits through the same route.
3. The new submission arrives as New, and the old one becomes Superseded automatically.

### 9.3 — Risk flags

**What is calculated:** A flag count per company. It is a count, not a score, and there is no weighting.

**Inputs:** The seven flag answers in the company's current Questionnaire submission's `answers`. These are not Yes/No everywhere. The workbook upload door offers Yes/No, but its review screen accepts whatever the supplier typed. The guided form offers the richer options listed below, taken from the portal's `src/lib/questions.js` (`GUIDED_FIELDS[].options`).

**Formula or rules:** A flag is raised on any answer short of a clear positive (the "Cautious" rule, confirmed by the builder on 18 September 2026). For each flag, only the answers in the **Not raised when** column count as not raised. A blank answer is unanswered. Every other non-blank value raises the flag, including unexpected free text from a workbook upload.

| # | Flag label (used in the filter and the indicators) | Question | Answer ID | Guided-form options | Not raised when the answer is |
|---|-----------------------------------|----------|----------|--------------------|------------------------------|
| 1 | PFAS in use | Do any of your products or production processes contain or utilise PFAS compounds? (E2-3) | `S3-2` | Yes · No · Under investigation | No |
| 2 | No SBTi target | Does your organisation have a Science-Based Target (SBTi) validated decarbonisation target? (E1-3) | `S2-5` | Yes — validated · Yes — submitted, awaiting validation · In progress · No | Yes — validated · Yes *(workbook)* |
| 3 | High water stress | Is your primary production facility located in a high-water-stress region (WRI Aqueduct score ≥3)? (E3-1) | `S4-3` | Yes · No · Not assessed | No |
| 4 | Near protected area | Are any of your production sites located within or adjacent to (within 1 km) a protected area or biodiversity hotspot? (E4-2) | `S6-1` | Yes · No · Not assessed | No |
| 5 | No human rights policy | Does your organisation have a formal Human Rights and Labour Rights Policy, aligned with the UN Guiding Principles? (S2-1) | `S7-1` | Yes · In development · No | Yes |
| 6 | No supply-chain HR due diligence | Have you conducted a human rights due diligence assessment of your Tier 1 and Tier 2 supply chains in the last 24 months? (S2-2) | `S7-2` | Yes — both tiers · Yes — Tier 1 only · In progress · No | Yes — both tiers · Yes *(workbook)* |
| 7 | No conflict minerals policy | Does your organisation have a verified conflict minerals policy (3TG) in place, including OECD Due Diligence guidance compliance? (G1-1) | `S7-4` | Yes · In development · No · Not applicable to our products | Yes · Not applicable to our products |

The seven answer IDs were verified against the portal's `src/lib/questions.js` on 18 September 2026 and all match. Plain "Yes" is included for flags 2 and 6 because the workbook offers only Yes/No, and a workbook "Yes" to those questions is the clear positive.

**Output:**
- Flag count: 0–7.
- Unanswered count: 0–7.
- The per-flag state for each of the seven: raised / not raised / unanswered.

**Edge cases:**
- **Blank answer:** a missing key, an empty string or whitespace is **unanswered**. It is never counted as a flag and never counted as "not raised". It adds 1 to the unanswered count, and its indicator shows unanswered.
- **Matching:** compare after trimming whitespace, case-insensitively, so "yes" and "Yes " both match Yes. A non-blank value that matches none of the flag's **Not raised when** answers raises the flag. It is never treated as unanswered.
- **EcoVadis-only company:** "Not assessable via questionnaire". Never 0 flags. Excluded when any single-flag filter is active.
- **Sort order:** by flag count descending by default. Not-assessable rows always sort after all assessable rows, in either sort direction. Ties sort by company name A–Z.

### 9.4 — Overview counts

- **Total:** the number of current submissions.
- **EcoVadis:** current submissions with `path = 'ecovadis'`.
- **Questionnaire:** current submissions with `path = 'full'`.

Total always equals EcoVadis + Questionnaire. It can exceed the number of companies.

---

## Section 10 — Brand and Visual Direction

**Brand reference:** The `data-leaf-brand` skill — the same one the portal uses. Upload it flat to the repo root; Claude Code installs it to `.claude/skills/data-leaf-brand/` in the first session and uses its `tokens.css` for all colours.

Colour roles, consistent with the portal:
- **Mint Cream `#EEF4F0`:** page background.
- **Silver `#DAD9D9`:** panels, table headers and the "New" badge.
- **Deep Space Blue `#0B3142`:** all text on light backgrounds and the top bar.
- **Deep Teal `#37663E`:** the "Accepted" badge, "Save status", "Log in" and section markers.
- **Burnt Clay `#B35634`:** the "Needs review" badge, raised flag indicators, links, error messages and the "Needs review" reason requirement.
- **Superseded badge:** muted Silver with Deep Space Blue text.
- **Pie chart:** EcoVadis in Deep Space Blue, Questionnaire in Deep Teal.

Never white backgrounds, never Tailwind blue or gray defaults. No dark mode.

**Type:** DM Sans Medium (500) for headings and figures; Inter Regular (400) for body, tables and labels.

**Visual feel:** Professional and data-heavy. It is the portal's look adapted for a working screen: denser tables, compact rows, no hero band and minimal decorative space. The voice is analytical and plain: no exclamation points, no emoji.

**Reference or inspiration:** The live portal at https://the-corporate-sep.netlify.app. Use the same wordmark treatment (DM Sans Medium "Data Leaf", since there is no logo file).

---

## Section 11 — API and Credentials

| Service | What it does in this tool | Key required | Where key is stored |
|---------|--------------------------|-------------|-------------------|
| Supabase | Database reads, status writes via `set_submission_status()`, email-and-password Auth | Anon / publishable key only (public, browser-safe; safe because of RLS and disabled signup) | Netlify environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the dashboard's own Netlify site, plus `.env.local` (gitignored) for local dev |

The service role key is **not used** by this tool. It must never appear in a `VITE_` variable, a committed file or the frontend.

> **Security rule — no exceptions:** No API key, token, password, or credential may appear in any HTML file, any JavaScript file, or any file committed to GitHub. Keys used by the frontend are stored as **Netlify environment variables**. Claude Code must enforce this regardless of tier or context.

> **Carry-over lessons from the portal build — Claude Code must apply them:**
> - **Copy the key with the dashboard's copy button.** Copy the anon key with the Supabase dashboard's copy button, never by mouse selection. The dashboard truncates the displayed key with a real `…` character. That character makes supabase-js throw `Failed to execute 'set' on 'Headers'` before any request leaves the browser, and nothing appears in Supabase logs.
> - **Rebuild after changing variables.** `VITE_` variables are inlined at build time, so after setting or changing them, use "Deploy project without cache".
> - **Leave "Contains secret values" unticked** on both variables.

**Credentials readiness:**

| Credential | Status | Where to get it |
|-----------|--------|----------------|
| Supabase URL + anon key | Available — the same values the portal uses | Supabase dashboard → Project Settings → API (copy button) |
| Supabase service role key | Exists — not used by this tool | — |
| Team login accounts | Needs creating — builder creates each user after the build's auth setup | Supabase dashboard → Authentication → Users → Add user |

---

## Section 12 — Out of Scope — Phase 2

| Deferred feature | Reason it is deferred |
|-----------------|----------------------|
| User levels / roles (different permissions per person) | Planned for a later version. This build is A2: everyone has the same permissions. Do not build role columns, role checks or role-based UI. |
| Any change to the supplier portal's code, pages, fields, routes, submission flow, workbook or capture screens | Explicitly excluded. The only portal-adjacent changes are the database additions in Section 5. |
| Messaging or notifying suppliers from the dashboard (email or otherwise) | Communication about "Needs review" stays outside the platform. |
| Supplier-facing visibility of their status | Suppliers have no login and the portal is unchanged. |
| CSV or PDF export of any view | On-screen is enough for this version. |
| AI features (summarising, classifying or scoring answers) | Not needed. |
| Scheduled automation (digests, reminders) | Not needed. |
| Weighting, scoring or grading risk flags | It is a plain count by design. |
| Self-signup | Invite-only. Signup is disabled at the Supabase level. |
| In-app "forgot password" / self-service password reset | Not requested. The builder resets passwords in the Supabase dashboard (see Section 15). |
| Editing supplier answers or identity from the dashboard | The dashboard is read-only apart from status. |
| Deleting submissions or companies from the dashboard | Not requested. It remains a Supabase dashboard task. |
| Viewing or downloading attached files | The portal never stored them. Only the name and size exist. |
| Per-submission historical contact details | The portal overwrites company contacts, and changing that would change the portal. |

---

## Section 13 — Acceptance Criteria

| # | What to verify | Expected result | Done? |
|---|---------------|-----------------|-------|
| 1 | Logged-out access | Visiting the site shows only View 1. No request for `companies`, `submissions` or `submission_status_changes` is made before login. | [ ] |
| 2 | Login | A builder-created user logs in with email and password and reaches View 2. A wrong password shows "Email or password not recognised." | [ ] |
| 3 | Signup disabled | A signup attempt through the Supabase API with the public anon key is refused, and "Allow new users to sign up" is confirmed off. | [ ] |
| 4 | Anon still locked out | As the anon role: `companies`, `submissions` and `submission_status_changes` each return 0 rows with rows present, and calling `set_submission_status()` is refused. | [ ] |
| 5 | Authenticated cannot write directly | As an authenticated user: a direct update or delete on `submissions`, an insert into `submission_status_changes`, and any write to `companies` are all refused. | [ ] |
| 6 | Overview | The three figures equal the counts of current submissions by route, total = EcoVadis + Questionnaire, and the pie matches. The zero state shows "No submissions yet." | [ ] |
| 7 | Flag rules | For a test Questionnaire submission with known answers, each of the seven flags is raised exactly per Section 9.3, and the count matches. This includes the guided-form options beyond Yes/No (for example "In progress" and "Not assessed" raise the flag, while "Not applicable to our products" does not). | [ ] |
| 8 | Blank flag answers | Blank flag answers add to the Unanswered count, never to the flag count. | [ ] |
| 9 | Not assessable | A company with only an EcoVadis current submission shows "Not assessable via questionnaire", never 0. It sorts after all assessable rows and is hidden under any single-flag filter. | [ ] |
| 10 | Flag board sort and filter | Sorting by flag count and by name works. Each of the seven single-flag filters shows exactly the companies with that flag raised. | [ ] |
| 11 | Register | Shows current submissions only. A company with both routes appears twice. It sorts by every column, and the search filters case-insensitively on partial legal name. | [ ] |
| 12 | Detail — content | Identity (5 fields + submission date) and the correct content per door. The 28 Questionnaire answers appear under the six section headings with notes, and blanks show "Not answered". | [ ] |
| 13 | Status change | Setting Accepted, then Needs review (with a reason), works and updates the badge, panel, timeline and register. Needs review with a blank reason is blocked in the UI **and** refused by the function. | [ ] |
| 14 | Status log | Every manual change writes one log row with the from/to status, reason, and the logged-in user's email and timestamp. The timeline shows it newest first. | [ ] |
| 15 | Automatic superseding — same route | A new submission through the same route as an existing current one makes the older one `superseded` automatically, with an "Automatic" log entry. The new one arrives as `new`. | [ ] |
| 16 | No superseding across routes | A Questionnaire submission from a company with a current EcoVadis submission leaves the EcoVadis one unchanged. Both are current. | [ ] |
| 17 | Superseded is locked | A superseded submission shows the locked message with no control, and `set_submission_status()` refuses it. It appears in the company's "Other submissions" list and opens in View 3. | [ ] |
| 18 | Portal unaffected | After all migrations, a real submission from the live portal (https://the-corporate-sep.netlify.app) still reaches its confirmation screen and writes both rows, with `status = 'new'`. An anon insert with `status = 'accepted'` is refused. | [ ] |
| 19 | Backfill | After migration, each (company, route) pair's most recent pre-existing submission is `new` and any older ones are `superseded`, with log entries. | [ ] |
| 20 | Log out | "Log out" ends the session and returns to View 1. Pressing back shows no supplier data. | [ ] |
| 21 | Brand | Data Leaf tokens used throughout. No white backgrounds, no default Tailwind blue/gray, no dark mode. | [ ] |
| 22 | Deployed | Live on its own Netlify URL, with both env variables set and a no-cache deploy done. Login and all three sections work on the deployed site on desktop. | [ ] |

---

## Section 14 — Build Path

**This tool's tier:** Tier 3

---

### Pre-build steps — complete these before opening Claude Code

- [ ] Tool Architect skill — interview complete, this spec is written and confirmed by the builder
- [ ] Project Governor skill — CLAUDE.md and PROGRESS.md produced from this spec, **with the portal's `docs/supabase-setup.md` supplied as a required input** (existing Supabase project)
- [ ] GitHub repo created by the builder — a new repo, separate from the portal's
- [ ] product-spec.md uploaded to the GitHub repo root
- [ ] CLAUDE.md uploaded to the GitHub repo root
- [ ] PROGRESS.md uploaded to the GitHub repo root
- [ ] Brand skill file uploaded to the GitHub repo root — `data-leaf-brand` (SKILL.md and tokens.css)
- [ ] **Portal reference files uploaded to the repo root:**
  - the portal's `docs/supabase-setup.md`;
  - the portal's `src/lib/questions.js`, the source of every Questionnaire question ID, question text, option list and section grouping the dashboard displays and flags;
  - the portal's `src/lib/ecovadis.js`, the source of the EcoVadis Q1–Q9 labels;
  - the portal's `src/lib/format.js`, for identical date and file-size formatting.
- [ ] Netlify connected to the GitHub repo (Netlify MCP is not active)
- [ ] All credentials identified and ready to enter as environment variables — not written in any file (see Section 11)

> Claude Code organizes these files into the correct folder structure (docs/, .claude/skills/) automatically at the start of the first session.

---

### Tier 3 — build session

- [ ] Open Claude Code in the project folder
- [ ] Claude Code runs First Session Setup: creates docs/, moves reference files, installs brand skill if provided
- [ ] Claude Code reads product-spec.md, CLAUDE.md, and PROGRESS.md
- [ ] **Supabase — existing project:** Claude Code reads docs/supabase-setup.md and reviews current schema before making any changes
- [ ] Claude Code copies `questions.js`, `ecovadis.js` and `format.js` unchanged into the dashboard's `src/lib/` and re-confirms the seven flag IDs (Section 9.3)
- [ ] Claude Code builds all database changes via Supabase MCP:
  - the status column and backfill;
  - the tightened anon insert policy;
  - the superseding trigger;
  - `submission_status_changes`;
  - `set_submission_status()`;
  - the authenticated read policies.
  
  It builds the Auth configuration too, and confirms with the builder that signup is disabled.
- [ ] Claude Code updates docs/supabase-setup.md, including why the authenticated select policy on `companies` is compatible with the portal's anon rule
- [ ] Claude Code builds the frontend
- [ ] Builder creates the team user accounts in the Supabase dashboard
- [ ] Test locally before deploying, including a live portal submission (acceptance criterion 18)
- [ ] **Netlify MCP not active:** push to main → Netlify deploys, then add environment variables manually and run "Deploy project without cache"
- [ ] Builder copies the updated docs/supabase-setup.md back into the portal repo's docs/
- [ ] Optional post-build: run Supabase QA skill to verify schema, RLS, and auth configuration

---

## Section 15 — Open Questions

| Question | Who answers it | Blocking? |
|----------|---------------|-----------|
| Do the seven flag question IDs in Section 9.3 match the portal's `questions.js`? | **Resolved 18 September 2026** — all seven match. The check also found the guided form's non-Yes/No options, now handled in Section 9.3 (v1.1). | No — resolved |
| How do team members recover a forgotten password? Current answer: the builder resets it in the Supabase dashboard. An in-app reset is out of scope. | Builder | No |
| Should the `isa` test company and its submission (already flagged for deletion in the portal's PROGRESS.md) be removed before the backfill runs, so it doesn't appear in the dashboard? | Builder | No |
| After this build, the portal repo's `docs/supabase-setup.md` and CLAUDE.md are out of date (status column, trigger, tightened insert policy, new table, authenticated policies). Update the portal's docs in its next session. | Builder | No |
| Free plan pauses after about a week idle and takes both tools down. Revisit if the dashboard or portal is used for real. | Builder | No |

---

## Section 16 — Tool Version History

| Version | Date | What changed in the tool |
|---------|------|--------------------------|
| v1.0 | 18 September 2026 | Initial build |
| v1.1 | 18 September 2026 | Pre-build correction, from verification against the portal's `src/lib`. §9.3 flag rules rewritten for the guided form's non-Yes/No options (Cautious rule). EcoVadis keys and label source named in View 3. `ecovadis.js` and `format.js` added to pre-build uploads. Acceptance criterion 7 extended. Blocking open question resolved. |

---

*This spec is written for Claude Code. It assumes zero prior context. Every decision, rule, and requirement must be explicit enough that the builder can hand this document to Claude Code without a single verbal explanation.*
