-- V15__performance_hardening_and_indexes.sql
-- Performance Hardening: Targeted composite indexes for sub-millisecond query execution on top operational workflows

-- 1. Expiring Memberships & Renewal Lookup (Used by daily renewal jobs and expiring members console)
CREATE INDEX IF NOT EXISTS idx_members_status_end_date 
    ON members(status, end_date) 
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_members_plan_status 
    ON members(plan_id, status) 
    WHERE is_deleted = false;

-- 2. Court Bookings: Facility schedule range queries and member booking lists
CREATE INDEX IF NOT EXISTS idx_bookings_range_status 
    ON bookings(start_at, end_at, status);

CREATE INDEX IF NOT EXISTS idx_bookings_member_history 
    ON bookings(member_id, status, start_at DESC);

-- 3. Shop & Fulfillment: Fast queue filtering and member purchase history
CREATE INDEX IF NOT EXISTS idx_shop_orders_member_created 
    ON shop_orders(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_orders_status_created 
    ON shop_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_tickets_member_status 
    ON service_job_tickets(member_id, status);

CREATE INDEX IF NOT EXISTS idx_service_tickets_status_due 
    ON service_job_tickets(status, promised_by);

-- 4. Bar POS & Kitchen Display System (KDS): Sub-millisecond open tabs and kitchen prep lines
CREATE INDEX IF NOT EXISTS idx_bar_tabs_status_opened 
    ON bar_tabs(status, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_bar_tabs_member_status 
    ON bar_tabs(member_id, status);

CREATE INDEX IF NOT EXISTS idx_tab_items_tab_prep 
    ON tab_items(tab_id, prep_status);

-- 5. Invoicing & Ledger: Member statements and accounts receivable age analysis
CREATE INDEX IF NOT EXISTS idx_invoices_member_status_due 
    ON invoices(member_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_member_created 
    ON payments(member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_source_lookup 
    ON payments(source_type, source_id);

-- 6. Lead CRM & Inquiries: Fast pipeline filtering and scheduled follow-ups
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_filter 
    ON leads(status, assigned_to, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_followup_status 
    ON leads(follow_up_at, status) 
    WHERE follow_up_at IS NOT NULL;

-- 7. HR & Staff Scheduling: Department rosters and payroll runs
CREATE INDEX IF NOT EXISTS idx_roster_shifts_dept_date 
    ON roster_shifts(department, shift_date, start_time);

CREATE INDEX IF NOT EXISTS idx_roster_shifts_emp_date 
    ON roster_shifts(employee_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period_status 
    ON payroll_runs(period_year, period_month, status);

CREATE INDEX IF NOT EXISTS idx_payslips_employee_run 
    ON payslips(employee_id, payroll_run_id);

-- 8. Audit Trail: Entity history and date-range forensic investigations
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup 
    ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_action 
    ON audit_logs(created_at DESC, action);
