# Supabase Security and Leave RPC Setup

Run the SQL script below in your Supabase SQL editor (same DB used by Prisma):

- `supabase/sql/20260217_hr_security_rls_and_leave_rpc.sql`

This script adds:

- RLS helper functions (`app_current_company_id`, `app_is_hr_admin`, manager checks)
- Table policies for employees/leaves/audit tables
- Storage policies for `employee-documents` bucket
- Overlap protection constraint on `leave_requests`
- Transactional leave RPCs:
  - `submit_leave_request(...)`
  - `decide_leave_request(...)`

Notes:

- Keep write operations routed through Server Actions/RPCs for field-level and transaction safety.
- Current app roles are intentionally limited to `hr_admin` and `employee`.
