-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('fixed_cost');

-- CreateEnum
CREATE TYPE "TeamModel" AS ENUM ('small', 'medium', 'large');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "LeaveApprovalDecision" AS ENUM ('approved', 'rejected');

-- CreateEnum
CREATE TYPE "PayrollCycleStatus" AS ENUM ('draft', 'processing', 'finalized', 'published');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('draft', 'processing', 'completed', 'failed', 'finalized');

-- CreateEnum
CREATE TYPE "PayrollComponentType" AS ENUM ('earning', 'deduction', 'tax');

-- CreateEnum
CREATE TYPE "PayrollValueType" AS ENUM ('fixed', 'percent');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('active', 'inactive', 'terminated', 'on_notice');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_name" TEXT,
    "project_type" "ProjectType" NOT NULL DEFAULT 'fixed_cost',
    "sprint_duration_weeks" INTEGER NOT NULL DEFAULT 2,
    "start_date_assumption" DATE,
    "team_model" "TeamModel" NOT NULL,
    "scope_text" TEXT,
    "tech_stack" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_outputs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "output_json" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" UUID,
    "employee_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "preferred_name" TEXT,
    "personal_email" TEXT,
    "work_email" TEXT,
    "phone" TEXT,
    "date_of_birth" DATE,
    "hire_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_jobs" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT,
    "employment_type" TEXT NOT NULL,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'active',
    "manager_employee_id" TEXT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_compensations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "pay_frequency" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "expires_on" DATE,
    "uploaded_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_manager_map" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "manager_employee_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_manager_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'days',
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "allow_negative" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accrual_frequency" TEXT NOT NULL,
    "accrual_start_month" INTEGER NOT NULL DEFAULT 1,
    "carry_forward_limit" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policy_entitlements" (
    "id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "annual_allocation" DECIMAL(10,2) NOT NULL,
    "max_carry_forward" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_policy_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policy_assignments" (
    "id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_balances" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "balance_year" INTEGER NOT NULL,
    "opening_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "accrued_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "used_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjusted_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "available_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "requested_by_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'pending',
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approvals" (
    "id" TEXT NOT NULL,
    "leave_request_id" TEXT NOT NULL,
    "approver_id" UUID NOT NULL,
    "decision" "LeaveApprovalDecision" NOT NULL,
    "comments" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_calendars" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "holiday_calendar_id" TEXT NOT NULL,
    "holiday_date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_cycles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "pay_date" DATE NOT NULL,
    "status" "PayrollCycleStatus" NOT NULL DEFAULT 'draft',
    "processed_by_id" UUID,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_components" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component_type" "PayrollComponentType" NOT NULL,
    "is_taxable" BOOLEAN NOT NULL DEFAULT false,
    "value_type" "PayrollValueType" NOT NULL DEFAULT 'fixed',
    "default_value" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_payroll_components" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "payroll_component_id" TEXT NOT NULL,
    "value_type" "PayrollValueType" NOT NULL DEFAULT 'fixed',
    "value" DECIMAL(12,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_payroll_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_inputs" (
    "id" TEXT NOT NULL,
    "payroll_cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "input_type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "payroll_cycle_id" TEXT NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'draft',
    "processed_by_id" UUID,
    "processing_notes" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_items" (
    "id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_item_components" (
    "id" TEXT NOT NULL,
    "payroll_run_item_id" TEXT NOT NULL,
    "payroll_component_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_run_item_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "payroll_run_item_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "storage_path" TEXT,
    "storage_bucket" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "actor_user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "project_outputs_project_id_idx" ON "project_outputs"("project_id");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_email_key" ON "users"("company_id", "email");

-- CreateIndex
CREATE INDEX "roles_company_id_idx" ON "roles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_company_id_key_key" ON "roles"("company_id", "key");

-- CreateIndex
CREATE INDEX "user_roles_company_id_idx" ON "user_roles"("company_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_company_user_role_key" ON "user_roles"("company_id", "user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_company_employee_number_key" ON "employees"("company_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employee_id_key" ON "employee_profiles"("employee_id");

-- CreateIndex
CREATE INDEX "employee_profiles_name_idx" ON "employee_profiles"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "employee_jobs_employee_id_idx" ON "employee_jobs"("employee_id");

-- CreateIndex
CREATE INDEX "employee_jobs_manager_employee_id_idx" ON "employee_jobs"("manager_employee_id");

-- CreateIndex
CREATE INDEX "employee_jobs_is_current_idx" ON "employee_jobs"("is_current");

-- CreateIndex
CREATE INDEX "employee_compensations_employee_id_idx" ON "employee_compensations"("employee_id");

-- CreateIndex
CREATE INDEX "employee_compensations_is_current_idx" ON "employee_compensations"("is_current");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_document_type_idx" ON "employee_documents"("document_type");

-- CreateIndex
CREATE INDEX "employee_manager_map_employee_id_idx" ON "employee_manager_map"("employee_id");

-- CreateIndex
CREATE INDEX "employee_manager_map_manager_employee_id_idx" ON "employee_manager_map"("manager_employee_id");

-- CreateIndex
CREATE INDEX "leave_types_company_id_idx" ON "leave_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_company_code_key" ON "leave_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "leave_policies_company_id_idx" ON "leave_policies"("company_id");

-- CreateIndex
CREATE INDEX "leave_policy_entitlements_leave_type_id_idx" ON "leave_policy_entitlements"("leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policy_entitlements_policy_type_key" ON "leave_policy_entitlements"("leave_policy_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_employee_id_idx" ON "leave_policy_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_leave_policy_id_idx" ON "leave_policy_assignments"("leave_policy_id");

-- CreateIndex
CREATE INDEX "employee_leave_balances_employee_id_idx" ON "employee_leave_balances"("employee_id");

-- CreateIndex
CREATE INDEX "employee_leave_balances_leave_type_id_idx" ON "employee_leave_balances"("leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_balances_emp_type_year_key" ON "employee_leave_balances"("employee_id", "leave_type_id", "balance_year");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_date_range_idx" ON "leave_requests"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "leave_approvals_leave_request_id_idx" ON "leave_approvals"("leave_request_id");

-- CreateIndex
CREATE INDEX "leave_approvals_approver_id_idx" ON "leave_approvals"("approver_id");

-- CreateIndex
CREATE INDEX "holiday_calendars_company_id_idx" ON "holiday_calendars"("company_id");

-- CreateIndex
CREATE INDEX "holidays_holiday_date_idx" ON "holidays"("holiday_date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_calendar_date_key" ON "holidays"("holiday_calendar_id", "holiday_date");

-- CreateIndex
CREATE INDEX "payroll_cycles_company_id_idx" ON "payroll_cycles"("company_id");

-- CreateIndex
CREATE INDEX "payroll_cycles_status_idx" ON "payroll_cycles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_cycles_company_period_key" ON "payroll_cycles"("company_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "payroll_components_company_id_idx" ON "payroll_components"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_components_company_code_key" ON "payroll_components"("company_id", "code");

-- CreateIndex
CREATE INDEX "employee_payroll_components_employee_id_idx" ON "employee_payroll_components"("employee_id");

-- CreateIndex
CREATE INDEX "employee_payroll_components_component_id_idx" ON "employee_payroll_components"("payroll_component_id");

-- CreateIndex
CREATE INDEX "payroll_inputs_payroll_cycle_id_idx" ON "payroll_inputs"("payroll_cycle_id");

-- CreateIndex
CREATE INDEX "payroll_inputs_employee_id_idx" ON "payroll_inputs"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_runs_company_id_idx" ON "payroll_runs"("company_id");

-- CreateIndex
CREATE INDEX "payroll_runs_payroll_cycle_id_idx" ON "payroll_runs"("payroll_cycle_id");

-- CreateIndex
CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs"("status");

-- CreateIndex
CREATE INDEX "payroll_run_items_payroll_run_id_idx" ON "payroll_run_items"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_run_items_employee_id_idx" ON "payroll_run_items"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_items_run_employee_key" ON "payroll_run_items"("payroll_run_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_run_item_components_item_id_idx" ON "payroll_run_item_components"("payroll_run_item_id");

-- CreateIndex
CREATE INDEX "payroll_run_item_components_component_id_idx" ON "payroll_run_item_components"("payroll_component_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_run_item_id_key" ON "payslips"("payroll_run_item_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_idx" ON "audit_logs"("company_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_lookup_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "project_outputs" ADD CONSTRAINT "project_outputs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_jobs" ADD CONSTRAINT "employee_jobs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_jobs" ADD CONSTRAINT "employee_jobs_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_compensations" ADD CONSTRAINT "employee_compensations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_manager_map" ADD CONSTRAINT "employee_manager_map_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_manager_map" ADD CONSTRAINT "employee_manager_map_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_entitlements" ADD CONSTRAINT "leave_policy_entitlements_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_entitlements" ADD CONSTRAINT "leave_policy_entitlements_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_holiday_calendar_id_fkey" FOREIGN KEY ("holiday_calendar_id") REFERENCES "holiday_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_cycles" ADD CONSTRAINT "payroll_cycles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_cycles" ADD CONSTRAINT "payroll_cycles_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_components" ADD CONSTRAINT "payroll_components_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_components" ADD CONSTRAINT "employee_payroll_components_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_components" ADD CONSTRAINT "employee_payroll_components_payroll_component_id_fkey" FOREIGN KEY ("payroll_component_id") REFERENCES "payroll_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_inputs" ADD CONSTRAINT "payroll_inputs_payroll_cycle_id_fkey" FOREIGN KEY ("payroll_cycle_id") REFERENCES "payroll_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_inputs" ADD CONSTRAINT "payroll_inputs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_cycle_id_fkey" FOREIGN KEY ("payroll_cycle_id") REFERENCES "payroll_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_items" ADD CONSTRAINT "payroll_run_items_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_items" ADD CONSTRAINT "payroll_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_item_components" ADD CONSTRAINT "payroll_run_item_components_payroll_run_item_id_fkey" FOREIGN KEY ("payroll_run_item_id") REFERENCES "payroll_run_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_item_components" ADD CONSTRAINT "payroll_run_item_components_payroll_component_id_fkey" FOREIGN KEY ("payroll_component_id") REFERENCES "payroll_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_item_id_fkey" FOREIGN KEY ("payroll_run_item_id") REFERENCES "payroll_run_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

