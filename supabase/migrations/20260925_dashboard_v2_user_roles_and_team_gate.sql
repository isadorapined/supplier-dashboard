-- Dashboard v2.0 access phase — docs/access-matrix.md §5 and §6.
--
-- Two tools, two access models, one database:
--   * the portal (Tool A, v3.1) lets any supplier verify an email by magic link,
--     so every verified supplier is `authenticated`;
--   * the dashboard (Tool B, v2.0) admits only its named team, by role.
-- `authenticated` therefore no longer means "the team". Membership is a live
-- row in user_roles, so this migration moves every dashboard gate from the
-- interim JWT flag (app_metadata.role = 'reviewer', added by
-- v31_scope_dashboard_access_to_reviewers) onto user_roles. A supplier has no
-- user_roles row and reaches nothing the dashboard reads.

-- 1. user_roles --------------------------------------------------------------

create table public.user_roles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id),
  email        text not null,
  role         text not null check (role in ('ehs', 'esg', 'procurement')),
  is_admin     boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Admin sits only on an active EHS/ESG account. This is also what refuses
  -- the Admin deactivating themselves or demoting themselves to Procurement.
  constraint user_roles_admin_is_active_reviewer
    check (not is_admin or (is_active and role in ('ehs', 'esg')))
);

comment on table public.user_roles is
  'Dashboard team: one row per login. Read own row only via RLS; every write goes through the Netlify admin function (service role). Never deleted — deactivate instead.';

-- At most one Admin (access matrix §6 line 10).
create unique index user_roles_one_admin on public.user_roles (is_admin) where is_admin;

-- At least one Admin: checked at the end of each statement, so moving Admin in
-- one statement (revoke + grant) passes and a bare revoke is refused.
create function public.user_roles_require_one_admin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.user_roles)
     and (select count(*) from public.user_roles where is_admin) <> 1 then
    raise exception 'Exactly one Admin is required. Name a successor in the same action.'
      using errcode = 'DL409';
  end if;
  return null;
end;
$$;

create constraint trigger user_roles_require_one_admin
  after insert or update or delete on public.user_roles
  deferrable initially immediate
  for each row execute function public.user_roles_require_one_admin();

create function public.user_roles_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_roles_touch_updated_at
  before update on public.user_roles
  for each row execute function public.user_roles_touch_updated_at();

revoke execute on function public.user_roles_require_one_admin() from public, anon, authenticated;
revoke execute on function public.user_roles_touch_updated_at() from public, anon, authenticated;

-- RLS: own row only (§6 line 7); no write policy for anyone (§6 line 8).
alter table public.user_roles enable row level security;

revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

create policy "team member may read own role"
  on public.user_roles for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- Seed: Isa's v1.1 login exists (spec §15), so she is the first Admin.
insert into public.user_roles (auth_user_id, email, role, is_admin)
select id, email, 'esg', true
  from auth.users
 where lower(email) = 'isadorapined@gmail.com';

-- 2. Dashboard reads: active team member, any role (§6 lines 1–3) -----------

drop policy "reviewer may read companies" on public.companies;
create policy "team member may read companies"
  on public.companies for select to authenticated
  using (exists (select 1 from public.user_roles r
                  where r.auth_user_id = (select auth.uid()) and r.is_active));

drop policy "reviewer may read submissions" on public.submissions;
create policy "team member may read submissions"
  on public.submissions for select to authenticated
  using (exists (select 1 from public.user_roles r
                  where r.auth_user_id = (select auth.uid()) and r.is_active));

drop policy "reviewer may read the status log" on public.submission_status_changes;
create policy "team member may read the status log"
  on public.submission_status_changes for select to authenticated
  using (exists (select 1 from public.user_roles r
                  where r.auth_user_id = (select auth.uid()) and r.is_active));

-- 3. set_submission_status(): EHS/ESG and active (§6 line 4) ----------------
-- Same body as before; the JWT reviewer check becomes a live user_roles read,
-- so a role change or deactivation applies on the very next call.

create or replace function public.set_submission_status(p_submission_id uuid, p_new_status text, p_reason text default null)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid      uuid := auth.uid();
  v_email    text := nullif(auth.jwt() ->> 'email', '');
  v_current  text;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = 'DL401';
  end if;

  if not exists (select 1 from public.user_roles
                  where auth_user_id = v_uid
                    and is_active
                    and role in ('ehs', 'esg')) then
    raise exception 'Only active EHS or ESG accounts can change a submission''s status.' using errcode = 'DL403';
  end if;

  if p_new_status not in ('accepted', 'needs_review') then
    raise exception 'Status % cannot be set by hand.', p_new_status using errcode = 'DL422';
  end if;

  -- Locks the row for the life of the transaction, so two team members
  -- saving at once cannot both read 'new' and write two log entries.
  select status into v_current
    from public.submissions
   where id = p_submission_id
   for update;

  if v_current is null then
    raise exception 'Submission not found.' using errcode = 'DL422';
  end if;

  if v_current = 'superseded' then
    raise exception 'This submission has been superseded and is locked.' using errcode = 'DL409';
  end if;

  if v_current = p_new_status then
    raise exception 'The submission is already %.', p_new_status using errcode = 'DL422';
  end if;

  if p_new_status = 'needs_review' and v_reason is null then
    raise exception 'A reason is required for Needs review.' using errcode = 'DL422';
  end if;

  update public.submissions
     set status = p_new_status
   where id = p_submission_id;

  insert into public.submission_status_changes
    (submission_id, from_status, to_status, reason, changed_by, changed_by_email)
  values
    (p_submission_id, v_current, p_new_status, v_reason, v_uid, v_email);
end;
$function$;

revoke execute on function public.set_submission_status(uuid, text, text) from public, anon;
grant execute on function public.set_submission_status(uuid, text, text) to authenticated;
