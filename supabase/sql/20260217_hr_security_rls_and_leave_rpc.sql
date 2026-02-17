-- HR platform hardening: helpers, RLS, overlap constraints, and transactional leave RPCs.
-- Run this in Supabase SQL editor against the same database used by Prisma.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create or replace function public.app_current_company_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.company_id
  from public.users u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.app_current_employee_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid()
    and e.company_id = public.app_current_company_id()
  limit 1
$$;

create or replace function public.app_is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.company_id = public.app_current_company_id()
      and r.key = 'hr_admin'
  )
$$;

create or replace function public.app_is_manager_of(p_employee_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_jobs ej
    where ej.employee_id = p_employee_id
      and ej.is_current = true
      and ej.manager_employee_id = public.app_current_employee_id()
  )
$$;

create or replace function public.app_is_manager_any()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_jobs ej
    where ej.is_current = true
      and ej.manager_employee_id = public.app_current_employee_id()
  )
$$;

create or replace view public.v_user_active_role as
select
  ur.user_id,
  ur.company_id,
  r.key as role_key
from public.user_roles ur
join public.roles r on r.id = ur.role_id;

grant select on public.v_user_active_role to authenticated;

alter table public.employees enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.employee_jobs enable row level security;
alter table public.employee_documents enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_policies enable row level security;
alter table public.leave_policy_entitlements enable row level security;
alter table public.leave_policy_assignments enable row level security;
alter table public.employee_leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_approvals enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists employees_select_policy on public.employees;
create policy employees_select_policy on public.employees
for select
to authenticated
using (
  company_id = public.app_current_company_id()
  and (
    public.app_is_hr_admin()
    or user_id = auth.uid()
    or public.app_is_manager_of(id)
  )
);

drop policy if exists employees_update_policy on public.employees;
create policy employees_update_policy on public.employees
for update
to authenticated
using (
  company_id = public.app_current_company_id()
  and (public.app_is_hr_admin() or user_id = auth.uid())
)
with check (
  company_id = public.app_current_company_id()
  and (public.app_is_hr_admin() or user_id = auth.uid())
);

drop policy if exists employees_insert_policy on public.employees;
create policy employees_insert_policy on public.employees
for insert
to authenticated
with check (
  company_id = public.app_current_company_id()
  and public.app_is_hr_admin()
);

drop policy if exists employee_profiles_select_policy on public.employee_profiles;
create policy employee_profiles_select_policy on public.employee_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_profiles.employee_id
      and e.company_id = public.app_current_company_id()
      and (
        public.app_is_hr_admin()
        or e.user_id = auth.uid()
        or public.app_is_manager_of(e.id)
      )
  )
);

drop policy if exists employee_profiles_modify_policy on public.employee_profiles;
create policy employee_profiles_modify_policy on public.employee_profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_profiles.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.employees e
    where e.id = employee_profiles.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid())
  )
);

drop policy if exists employee_jobs_select_policy on public.employee_jobs;
create policy employee_jobs_select_policy on public.employee_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_jobs.employee_id
      and e.company_id = public.app_current_company_id()
      and (
        public.app_is_hr_admin()
        or e.user_id = auth.uid()
        or public.app_is_manager_of(e.id)
      )
  )
);

drop policy if exists employee_jobs_modify_policy on public.employee_jobs;
create policy employee_jobs_modify_policy on public.employee_jobs
for all
to authenticated
using (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.employees e
    where e.id = employee_jobs.employee_id
      and e.company_id = public.app_current_company_id()
  )
)
with check (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.employees e
    where e.id = employee_jobs.employee_id
      and e.company_id = public.app_current_company_id()
  )
);

drop policy if exists employee_documents_select_policy on public.employee_documents;
create policy employee_documents_select_policy on public.employee_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_documents.employee_id
      and e.company_id = public.app_current_company_id()
      and (
        public.app_is_hr_admin()
        or e.user_id = auth.uid()
        or public.app_is_manager_of(e.id)
      )
  )
);

drop policy if exists employee_documents_modify_policy on public.employee_documents;
create policy employee_documents_modify_policy on public.employee_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_documents.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.employees e
    where e.id = employee_documents.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid())
  )
);

drop policy if exists leave_types_read_policy on public.leave_types;
create policy leave_types_read_policy on public.leave_types
for select
to authenticated
using (company_id = public.app_current_company_id());

drop policy if exists leave_types_manage_policy on public.leave_types;
create policy leave_types_manage_policy on public.leave_types
for all
to authenticated
using (company_id = public.app_current_company_id() and public.app_is_hr_admin())
with check (company_id = public.app_current_company_id() and public.app_is_hr_admin());

drop policy if exists leave_policies_read_policy on public.leave_policies;
create policy leave_policies_read_policy on public.leave_policies
for select
to authenticated
using (company_id = public.app_current_company_id());

drop policy if exists leave_policies_manage_policy on public.leave_policies;
create policy leave_policies_manage_policy on public.leave_policies
for all
to authenticated
using (company_id = public.app_current_company_id() and public.app_is_hr_admin())
with check (company_id = public.app_current_company_id() and public.app_is_hr_admin());

drop policy if exists leave_policy_entitlements_read_policy on public.leave_policy_entitlements;
create policy leave_policy_entitlements_read_policy on public.leave_policy_entitlements
for select
to authenticated
using (
  exists (
    select 1
    from public.leave_policies p
    where p.id = leave_policy_entitlements.leave_policy_id
      and p.company_id = public.app_current_company_id()
  )
);

drop policy if exists leave_policy_entitlements_manage_policy on public.leave_policy_entitlements;
create policy leave_policy_entitlements_manage_policy on public.leave_policy_entitlements
for all
to authenticated
using (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.leave_policies p
    where p.id = leave_policy_entitlements.leave_policy_id
      and p.company_id = public.app_current_company_id()
  )
)
with check (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.leave_policies p
    where p.id = leave_policy_entitlements.leave_policy_id
      and p.company_id = public.app_current_company_id()
  )
);

drop policy if exists leave_policy_assignments_read_policy on public.leave_policy_assignments;
create policy leave_policy_assignments_read_policy on public.leave_policy_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = leave_policy_assignments.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid() or public.app_is_manager_of(e.id))
  )
);

drop policy if exists leave_policy_assignments_manage_policy on public.leave_policy_assignments;
create policy leave_policy_assignments_manage_policy on public.leave_policy_assignments
for all
to authenticated
using (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.employees e
    where e.id = leave_policy_assignments.employee_id
      and e.company_id = public.app_current_company_id()
  )
)
with check (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.employees e
    where e.id = leave_policy_assignments.employee_id
      and e.company_id = public.app_current_company_id()
  )
);

drop policy if exists leave_balances_read_policy on public.employee_leave_balances;
create policy leave_balances_read_policy on public.employee_leave_balances
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_leave_balances.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid() or public.app_is_manager_of(e.id))
  )
);

drop policy if exists leave_balances_manage_policy on public.employee_leave_balances;
create policy leave_balances_manage_policy on public.employee_leave_balances
for all
to authenticated
using (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.employees e
    where e.id = employee_leave_balances.employee_id
      and e.company_id = public.app_current_company_id()
  )
)
with check (
  public.app_is_hr_admin()
  and exists (
    select 1
    from public.employees e
    where e.id = employee_leave_balances.employee_id
      and e.company_id = public.app_current_company_id()
  )
);

drop policy if exists leave_requests_select_policy on public.leave_requests;
create policy leave_requests_select_policy on public.leave_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid() or public.app_is_manager_of(e.id))
  )
);

drop policy if exists leave_requests_insert_policy on public.leave_requests;
create policy leave_requests_insert_policy on public.leave_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.company_id = public.app_current_company_id()
      and e.user_id = auth.uid()
  )
);

drop policy if exists leave_requests_update_policy on public.leave_requests;
create policy leave_requests_update_policy on public.leave_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or public.app_is_manager_of(e.id))
  )
)
with check (
  exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or public.app_is_manager_of(e.id))
  )
);

drop policy if exists leave_approvals_select_policy on public.leave_approvals;
create policy leave_approvals_select_policy on public.leave_approvals
for select
to authenticated
using (
  exists (
    select 1
    from public.leave_requests lr
    join public.employees e on e.id = lr.employee_id
    where lr.id = leave_approvals.leave_request_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or e.user_id = auth.uid() or public.app_is_manager_of(e.id))
  )
);

drop policy if exists leave_approvals_insert_policy on public.leave_approvals;
create policy leave_approvals_insert_policy on public.leave_approvals
for insert
to authenticated
with check (
  approver_id = auth.uid()
  and exists (
    select 1
    from public.leave_requests lr
    join public.employees e on e.id = lr.employee_id
    where lr.id = leave_approvals.leave_request_id
      and e.company_id = public.app_current_company_id()
      and (public.app_is_hr_admin() or public.app_is_manager_of(e.id))
  )
);

drop policy if exists audit_logs_select_policy on public.audit_logs;
create policy audit_logs_select_policy on public.audit_logs
for select
to authenticated
using (
  company_id = public.app_current_company_id()
  and public.app_is_hr_admin()
);

drop policy if exists audit_logs_insert_policy on public.audit_logs;
create policy audit_logs_insert_policy on public.audit_logs
for insert
to authenticated
with check (
  company_id = public.app_current_company_id()
  and (public.app_is_hr_admin() or actor_user_id = auth.uid())
);

alter table if exists storage.objects enable row level security;

drop policy if exists employee_documents_storage_read on storage.objects;
create policy employee_documents_storage_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'employee-documents'
  and (
    public.app_is_hr_admin()
    or (storage.foldername(name))[2] = public.app_current_employee_id()
  )
);

drop policy if exists employee_documents_storage_insert on storage.objects;
create policy employee_documents_storage_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-documents'
  and (
    public.app_is_hr_admin()
    or (storage.foldername(name))[2] = public.app_current_employee_id()
  )
);

drop policy if exists employee_documents_storage_delete on storage.objects;
create policy employee_documents_storage_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'employee-documents'
  and (
    public.app_is_hr_admin()
    or (storage.foldername(name))[2] = public.app_current_employee_id()
  )
);

alter table public.leave_requests
  drop constraint if exists leave_requests_no_overlap;

alter table public.leave_requests
  add constraint leave_requests_no_overlap
  exclude using gist (
    employee_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (status in ('pending'::"LeaveRequestStatus", 'approved'::"LeaveRequestStatus"));

create or replace function public.app_recalculate_leave_balance(
  p_employee_id text,
  p_leave_type_id text,
  p_year int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year_start date := make_date(p_year, 1, 1);
  v_year_end date := make_date(p_year, 12, 31);
  v_opening numeric(10,2) := 0;
  v_used numeric(10,2) := 0;
  v_pending numeric(10,2) := 0;
begin
  select coalesce(lpe.annual_allocation, 0)
  into v_opening
  from public.leave_policy_assignments lpa
  join public.leave_policies lp on lp.id = lpa.leave_policy_id and lp.is_active = true
  join public.leave_policy_entitlements lpe on lpe.leave_policy_id = lp.id and lpe.leave_type_id = p_leave_type_id
  where lpa.employee_id = p_employee_id
    and lpa.effective_from <= v_year_end
    and (lpa.effective_to is null or lpa.effective_to >= v_year_start)
  order by lpa.effective_from desc
  limit 1;

  select coalesce(sum(lr.quantity), 0)
  into v_used
  from public.leave_requests lr
  where lr.employee_id = p_employee_id
    and lr.leave_type_id = p_leave_type_id
    and lr.status = 'approved'::"LeaveRequestStatus"
    and lr.start_date <= v_year_end
    and lr.end_date >= v_year_start;

  select coalesce(sum(lr.quantity), 0)
  into v_pending
  from public.leave_requests lr
  where lr.employee_id = p_employee_id
    and lr.leave_type_id = p_leave_type_id
    and lr.status = 'pending'::"LeaveRequestStatus"
    and lr.start_date <= v_year_end
    and lr.end_date >= v_year_start;

  insert into public.employee_leave_balances (
    id, employee_id, leave_type_id, balance_year,
    opening_balance, accrued_amount, used_amount, pending_amount, adjusted_amount, available_amount, updated_at
  )
  values (
    gen_random_uuid()::text, p_employee_id, p_leave_type_id, p_year,
    v_opening, 0, v_used, v_pending, 0, v_opening - v_used - v_pending, now()
  )
  on conflict (employee_id, leave_type_id, balance_year)
  do update set
    opening_balance = excluded.opening_balance,
    used_amount = excluded.used_amount,
    pending_amount = excluded.pending_amount,
    available_amount = excluded.available_amount,
    updated_at = now();
end;
$$;

create or replace function public.submit_leave_request(
  p_leave_type_id text,
  p_start_date date,
  p_end_date date,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id text;
  v_company_id text;
  v_year int;
  v_qty numeric(10,2);
  v_allow_negative boolean;
  v_available numeric(10,2);
  v_request_id text;
begin
  v_company_id := public.app_current_company_id();
  v_employee_id := public.app_current_employee_id();
  if v_company_id is null or v_employee_id is null then
    raise exception 'Employee mapping missing';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Invalid date range';
  end if;

  if not exists (
    select 1 from public.leave_types lt
    where lt.id = p_leave_type_id
      and lt.company_id = v_company_id
      and lt.is_active = true
  ) then
    raise exception 'Invalid leave type';
  end if;

  v_qty := (p_end_date - p_start_date + 1)::numeric(10,2);
  v_year := extract(year from p_start_date)::int;

  perform pg_advisory_xact_lock(hashtext(v_employee_id || ':' || p_leave_type_id || ':' || v_year::text));

  select lt.allow_negative
  into v_allow_negative
  from public.leave_types lt
  where lt.id = p_leave_type_id;

  perform public.app_recalculate_leave_balance(v_employee_id, p_leave_type_id, v_year);

  select elb.available_amount
  into v_available
  from public.employee_leave_balances elb
  where elb.employee_id = v_employee_id
    and elb.leave_type_id = p_leave_type_id
    and elb.balance_year = v_year
  for update;

  if coalesce(v_allow_negative, false) = false and coalesce(v_available, 0) < v_qty then
    raise exception 'Insufficient leave balance';
  end if;

  insert into public.leave_requests (
    id, employee_id, leave_type_id, requested_by_id,
    start_date, end_date, quantity, reason, status, created_at, updated_at
  )
  values (
    gen_random_uuid()::text, v_employee_id, p_leave_type_id, auth.uid(),
    p_start_date, p_end_date, v_qty, p_reason, 'pending'::"LeaveRequestStatus", now(), now()
  )
  returning id into v_request_id;

  perform public.app_recalculate_leave_balance(v_employee_id, p_leave_type_id, v_year);

  insert into public.audit_logs (
    id, company_id, actor_user_id, entity_type, entity_id, action, payload, created_at
  )
  values (
    gen_random_uuid()::text, v_company_id, auth.uid(), 'leave_request', v_request_id, 'leave_request_created',
    jsonb_build_object('leave_type_id', p_leave_type_id, 'quantity', v_qty), now()
  );

  return v_request_id;
end;
$$;

create or replace function public.decide_leave_request(
  p_leave_request_id text,
  p_decision text,
  p_comments text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id text;
  v_employee_id text;
  v_leave_type_id text;
  v_status "LeaveRequestStatus";
  v_is_hr boolean;
  v_is_direct_manager boolean;
begin
  v_company_id := public.app_current_company_id();
  if v_company_id is null then
    raise exception 'Company scope missing';
  end if;

  select lr.employee_id, lr.leave_type_id, lr.status
  into v_employee_id, v_leave_type_id, v_status
  from public.leave_requests lr
  join public.employees e on e.id = lr.employee_id
  where lr.id = p_leave_request_id
    and e.company_id = v_company_id
  for update;

  if v_employee_id is null then
    raise exception 'Leave request not found';
  end if;
  if v_status <> 'pending'::"LeaveRequestStatus" then
    raise exception 'Only pending requests can be decided';
  end if;

  v_is_hr := public.app_is_hr_admin();
  v_is_direct_manager := public.app_is_manager_of(v_employee_id);
  if not v_is_hr and not v_is_direct_manager then
    raise exception 'Forbidden';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  update public.leave_requests
  set
    status = case when p_decision = 'approved'
      then 'approved'::"LeaveRequestStatus"
      else 'rejected'::"LeaveRequestStatus"
    end,
    decided_at = now(),
    updated_at = now()
  where id = p_leave_request_id;

  insert into public.leave_approvals (
    id, leave_request_id, approver_id, decision, comments, decided_at
  )
  values (
    gen_random_uuid()::text,
    p_leave_request_id,
    auth.uid(),
    case when p_decision = 'approved'
      then 'approved'::"LeaveApprovalDecision"
      else 'rejected'::"LeaveApprovalDecision"
    end,
    p_comments,
    now()
  );

  perform public.app_recalculate_leave_balance(
    v_employee_id,
    v_leave_type_id,
    extract(year from now())::int
  );

  insert into public.audit_logs (
    id, company_id, actor_user_id, entity_type, entity_id, action, payload, created_at
  )
  values (
    gen_random_uuid()::text, v_company_id, auth.uid(), 'leave_request', p_leave_request_id, 'leave_request_decided',
    jsonb_build_object('decision', p_decision, 'comments', p_comments), now()
  );
end;
$$;

grant execute on function public.submit_leave_request(text, date, date, text) to authenticated;
grant execute on function public.decide_leave_request(text, text, text) to authenticated;
grant execute on function public.app_recalculate_leave_balance(text, text, int) to authenticated;
