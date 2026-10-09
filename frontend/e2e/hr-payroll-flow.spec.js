import { test, expect } from '@playwright/test';

test.describe('HR & Payroll End-to-End Workflow', () => {
  test('Staff applies for leave, manager approves with coverage check, balance decreases, and payroll run reflects calculations', async ({ page }) => {
    // 1. Initial State
    let leaveBalance = {
      id: 'bal-1',
      leaveTypeCode: 'CASUAL',
      year: 2026,
      allocatedDays: 12.0,
      usedDays: 0.0,
      pendingDays: 0.0,
      remainingDays: 12.0,
    };

    let leaveRequests = [];

    let mockEmployees = [
      {
        id: 'emp-101',
        empNo: 'EMP-1001',
        userFullName: 'Arjun Verma',
        designation: 'Front Desk Lead',
        department: 'FRONT_DESK',
        joinDate: '2026-01-15',
        salaryType: 'MONTHLY',
        baseSalary: 60000.00,
        hourlyRate: 375.00,
        bankAccountMasked: '•••• •••• 1234',
        panNumberMasked: '••••••543K',
        status: 'ACTIVE',
      },
    ];

    let mockPayrollRuns = [];
    let mockPayslips = [];

    // 2. Mock Backend Endpoints
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-mgr-01',
          fullName: 'Kavya Manager',
          email: 'manager@championsclub.com',
          role: 'MANAGER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/sse/**', (route) => route.abort());
    await page.route('**/notifications/**', (route) => route.fulfill({ status: 200, json: [] }));

    await page.route('**/api/v1/hr/employees', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEmployees),
      });
    });

    await page.route('**/api/v1/hr/leave/holidays', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/v1/hr/leave/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { code: 'CASUAL', name: 'Casual Leave', maxDaysPerYear: 12, isPaid: true },
          { code: 'SICK', name: 'Sick Leave', maxDaysPerYear: 10, isPaid: true },
        ]),
      });
    });

    await page.route(/\/api\/v1\/hr\/leave\/balances(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([leaveBalance]),
      });
    });

    await page.route(/\/api\/v1\/hr\/leave\/calculate(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          startDate: '2026-06-10',
          endDate: '2026-06-11',
          workingDaysCount: 2.0,
          weekendsCount: 0,
          holidaysCount: 0,
          isValid: true,
          validationMessage: null,
        }),
      });
    });

    await page.route('**/api/v1/hr/leave/apply', async (route) => {
      const data = JSON.parse(route.request().postData());
      const newReq = {
        id: 'req-901',
        employeeId: 'emp-101',
        employeeName: 'Arjun Verma',
        employeeUserId: 'user-arjun',
        leaveTypeCode: data.leaveTypeCode,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: 2.0,
        reason: data.reason,
        status: 'PENDING',
        isHalfDay: false,
        createdAt: new Date().toISOString(),
      };
      leaveRequests.push(newReq);
      // Balance updates pending
      leaveBalance.pendingDays = 2.0;
      leaveBalance.remainingDays = 10.0;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newReq),
      });
    });

    await page.route('**/api/v1/hr/leave/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(leaveRequests),
      });
    });

    await page.route(/\/api\/v1\/hr\/leave\/requests\/[^/]+\/review/, async (route) => {
      const data = JSON.parse(route.request().postData());
      if (leaveRequests.length > 0) {
        leaveRequests[0].status = data.status;
      }
      if (data.status === 'APPROVED') {
        leaveBalance.usedDays = 2.0;
        leaveBalance.pendingDays = 0.0;
        leaveBalance.remainingDays = 10.0;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          request: leaveRequests[0],
          hasCoverageGaps: false,
          coverageGapWarning: null,
        }),
      });
    });

    await page.route(/\/api\/v1\/hr\/roster(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route(/\/api\/v1\/hr\/roster\/coverage-gaps(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/v1/hr/attendance/today', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    // Payroll mocks
    await page.route(/\/api\/v1\/hr\/payroll\/runs(\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        const data = JSON.parse(route.request().postData());
        const newRun = {
          id: 'run-601',
          runNumber: `PR-${data.year}-06-0001`,
          year: data.year,
          month: data.month,
          status: 'DRAFT',
          totalGross: 67125.00,
          totalDeductions: 6912.50,
          totalNet: 60212.50,
          notes: data.notes || 'June Payroll',
          payslipsCount: 1,
        };
        mockPayrollRuns = [newRun];
        mockPayslips = [
          {
            id: 'slip-01',
            payslipNumber: 'PS-2026-06-EMP-1001',
            employeeName: 'Arjun Verma',
            baseSalary: 60000.00,
            prorationFactor: '1.0000',
            overtimeHours: 10.0,
            overtimePay: 5625.00,
            allowances: 1500.00,
            grossPay: 67125.00,
            taxDeduction: 6712.50,
            unpaidLeaveDays: 0.0,
            unpaidLeaveDeduction: 0.0,
            otherDeductions: 200.00,
            totalDeductions: 6912.50,
            netPay: 60212.50,
          },
        ];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newRun),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPayrollRuns),
        });
      }
    });

    await page.route(/\/api\/v1\/hr\/payroll\/runs\/[^/]+\/payslips/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPayslips),
      });
    });

    // 3. Inject manager credentials & navigate
    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-manager-token');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-mgr-01',
          fullName: 'Kavya Manager',
          email: 'manager@championsclub.com',
          role: 'MANAGER',
          status: 'ACTIVE',
        })
      );
    });

    await page.goto('/console/hr');

    // 4. Verify Staff Directory view
    await expect(page.locator('text=Human Resources & Staff Payroll')).toBeVisible();
    await expect(page.locator('text=Arjun Verma')).toBeVisible();
    await expect(page.locator('text=EMP-1001')).toBeVisible();
    await expect(page.locator('text=•••• •••• 1234')).toBeVisible();

    // 5. Navigate to Leave & Absences
    await page.getByRole('button', { name: /Leave & Absences/i }).click();

    // Verify initial balance
    await expect(page.locator('text=12 days left')).toBeVisible();

    // 6. Apply for Leave
    await page.getByRole('button', { name: /Apply for Leave/i }).click();
    await expect(page.getByRole('heading', { name: 'Apply for Leave' })).toBeVisible();

    await page.locator('textarea[placeholder="Explain reason for leave..."]').fill('Family celebration in hometown');

    // Wait for live working days preview
    await expect(page.locator('text=Working Days Count: 2 day(s)')).toBeVisible();

    // Submit leave application
    await page.getByRole('button', { name: /Submit Leave Request/i }).click();

    // 7. Verify pending request in manager queue
    await expect(page.locator('text=Family celebration in hometown')).toBeVisible();
    await expect(page.locator('text=PENDING').first()).toBeVisible();

    // 8. Manager approves leave request
    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByRole('heading', { name: 'Review Leave Application' })).toBeVisible();

    await page.locator('textarea[placeholder="Manager comment..."]').fill('Approved. Front desk coverage confirmed.');
    await page.getByRole('button', { name: /Approve & Update Roster/i }).click();

    // Verify status changed to APPROVED and balance decreased
    await expect(page.locator('text=APPROVED').first()).toBeVisible();
    await expect(page.locator('text=10 days left')).toBeVisible();

    // 9. Navigate to Payroll Run Wizard
    await page.getByRole('button', { name: /Payroll Run Wizard/i }).click();

    // Click Generate Payroll
    await page.getByRole('button', { name: /Generate \/ Recalculate Payroll/i }).click();
    await expect(page.getByRole('heading', { name: 'Generate Monthly Payroll' })).toBeVisible();

    await page.locator('input[placeholder="e.g. Regular June payroll run"]').fill('June 2026 Executive Payroll');
    await page.getByRole('button', { name: /Calculate & Generate/i }).click();

    // 10. Verify generated payroll run and calculations
    await expect(page.locator('text=PR-2026-06-0001')).toBeVisible();
    await expect(page.locator('text=₹67,125').first()).toBeVisible(); // Gross
    await expect(page.locator('text=/60,212/').first()).toBeVisible(); // Net Payout
    await expect(page.locator('text=PS-2026-06-EMP-1001')).toBeVisible();

    // 11. Open Payslip Viewer
    await page.locator('button[title="View Breakdown"]').first().click();
    await expect(page.getByRole('heading', { name: 'Official Payslip Voucher' })).toBeVisible();
    await expect(page.locator('text=GROSS EARNINGS:')).toBeVisible();
    await expect(page.locator('text=NET TAKE-HOME:')).toBeVisible();
    await expect(page.locator('text=Download PDF')).toBeVisible();
  });
});
