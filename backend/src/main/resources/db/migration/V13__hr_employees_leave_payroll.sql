-- V13__hr_employees_leave_payroll.sql
-- Module: HR + PAYROLL (Employees, Rosters, Attendance, Leave Management, Payroll Runs, Payslips)

-- 1. Sequences for human-readable IDs
CREATE SEQUENCE IF NOT EXISTS emp_no_seq START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS payroll_run_no_seq START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS payslip_no_seq START WITH 1001 INCREMENT BY 1;

-- 2. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT UNIQUE,
    emp_no VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL, -- OPERATIONS, COACHING, F_AND_B, ADMINISTRATION, MAINTENANCE
    join_date DATE NOT NULL,
    salary_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, HOURLY
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bank_name VARCHAR(100),
    bank_account_masked VARCHAR(50), -- e.g. ••••••••4321
    bank_ifsc VARCHAR(20),
    pan_number_masked VARCHAR(20), -- e.g. ABCDE••••F
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ON_LEAVE, TERMINATED, RESIGNED
    exit_date DATE,
    emergency_contact_phone VARCHAR(30),
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_emp_salary_type CHECK (salary_type IN ('MONTHLY', 'HOURLY')),
    CONSTRAINT chk_emp_status CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED')),
    CONSTRAINT chk_emp_base_salary CHECK (base_salary >= 0),
    CONSTRAINT chk_emp_hourly_rate CHECK (hourly_rate >= 0),
    CONSTRAINT chk_emp_dates CHECK (exit_date IS NULL OR exit_date >= join_date)
);

CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_join_date ON employees(join_date);

-- 3. Roster Shifts Table (Planning & Schedule Publishing)
CREATE TABLE IF NOT EXISTS roster_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    department VARCHAR(100) NOT NULL,
    station VARCHAR(50) NOT NULL, -- FRONT_DESK, BAR, KITCHEN, SHOP, COURTS
    role VARCHAR(50) NOT NULL,    -- FRONT_DESK, BAR_STAFF, KITCHEN, SHOP_STAFF, COACH
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roster_shifts_date ON roster_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_roster_shifts_employee ON roster_shifts(employee_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_roster_shifts_dept_date ON roster_shifts(department, shift_date);

-- Link operational cashier shifts (from P11) back to planned roster
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS roster_shift_id UUID REFERENCES roster_shifts(id) ON DELETE SET NULL;

-- 4. Attendance Records Table (Clock in / Clock out)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL, -- Shift origin day (for overnight shift attribution)
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL DEFAULT 'WEB_CONSOLE', -- WEB_CONSOLE, BIOMETRIC, QR_TERMINAL, MANUAL
    status VARCHAR(40) NOT NULL DEFAULT 'PRESENT', -- PRESENT, HALF_DAY, LATE, AUTO_FLAGGED_MISSING_CLOCK_OUT, REGULARIZED
    total_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    regularization_note TEXT,
    regularized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    regularized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_attendance_status CHECK (status IN ('PRESENT', 'HALF_DAY', 'LATE', 'AUTO_FLAGGED_MISSING_CLOCK_OUT', 'REGULARIZED'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- 5. Official Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- 6. Leave Types Table
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- CASUAL, SICK, PAID, UNPAID
    name VARCHAR(100) NOT NULL,
    annual_quota NUMERIC(5, 1) NOT NULL DEFAULT 12.0,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    carry_forward_max NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_code VARCHAR(50) NOT NULL REFERENCES leave_types(code) ON DELETE CASCADE,
    year INT NOT NULL,
    allocated_days NUMERIC(5, 1) NOT NULL DEFAULT 12.0,
    used_days NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    pending_days NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    remaining_days NUMERIC(5, 1) NOT NULL DEFAULT 12.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_leave_balance UNIQUE (employee_id, leave_type_code, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id, year);

-- 8. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_code VARCHAR(50) NOT NULL REFERENCES leave_types(code) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    half_day_session VARCHAR(20), -- FIRST_HALF, SECOND_HALF
    total_days NUMERIC(5, 1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_comment TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_leave_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_leave_date_order CHECK (start_date <= end_date),
    CONSTRAINT chk_leave_total_days CHECK (total_days > 0)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- 9. Payroll Runs Table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_number VARCHAR(50) NOT NULL UNIQUE,
    year INT NOT NULL,
    month INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, REVIEW, APPROVED, PAID
    total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payroll_status CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'PAID')),
    CONSTRAINT uk_payroll_year_month UNIQUE (year, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_year_month ON payroll_runs(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- 10. Payslips Table
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    payslip_number VARCHAR(50) NOT NULL UNIQUE,
    year INT NOT NULL,
    month INT NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL,
    proration_factor NUMERIC(7, 4) NOT NULL DEFAULT 1.0000,
    working_days_in_month INT NOT NULL,
    days_worked NUMERIC(5, 2) NOT NULL,
    unpaid_leave_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    overtime_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_pay NUMERIC(12, 2) NOT NULL,
    tax_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unpaid_leave_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL,
    net_pay NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, PAID
    pdf_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_payslip_employee_month UNIQUE (employee_id, year, month),
    CONSTRAINT chk_payslip_status CHECK (status IN ('DRAFT', 'APPROVED', 'PAID'))
);

CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);

-- 11. Initial Seed Data
-- Standard Leave Types
INSERT INTO leave_types (code, name, annual_quota, is_paid, carry_forward_max)
VALUES 
    ('CASUAL', 'Casual Leave (CL)', 12.0, TRUE, 3.0),
    ('SICK', 'Sick Leave (SL)', 12.0, TRUE, 5.0),
    ('PAID', 'Earned / Paid Leave (PL)', 15.0, TRUE, 10.0),
    ('UNPAID', 'Leave Without Pay (LWP)', 0.0, FALSE, 0.0)
ON CONFLICT (code) DO NOTHING;

-- Official Holidays for Year 2026
INSERT INTO holidays (holiday_date, name, is_optional)
VALUES
    ('2026-01-26', 'Republic Day', FALSE),
    ('2026-05-01', 'May Day / Labour Day', FALSE),
    ('2026-08-15', 'Independence Day', FALSE),
    ('2026-10-02', 'Gandhi Jayanti', FALSE),
    ('2026-11-01', 'Kannada Rajyotsava', FALSE),
    ('2026-12-25', 'Christmas Day', FALSE)
ON CONFLICT (holiday_date) DO NOTHING;
