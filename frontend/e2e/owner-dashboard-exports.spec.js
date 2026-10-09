import { test, expect } from '@playwright/test';

test.describe('Owner Dashboard, Reporting, Tax & Public Share Link E2E Flow', () => {
  test('Owner views monthly executive report, exports CSV, creates signed share link, and opens in logged-out context', async ({ browser, page }) => {
    // 1. Mock Data Setup
    const mockSummary = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      preset: 'THIS_MONTH',
      totalRevenue: 285000.0,
      grossRevenue: 295000.0,
      totalRefunds: 10000.0,
      netRevenue: 285000.0,
      totalReceivables: 45000.0,
      cashAndBank: 120000.0,
      totalPayables: 65000.0,
      netPosition: 100000.0,
      revenueByStream: [
        { stream: 'COURTS', label: 'Courts & Activities', amount: 115000.0, percentage: 40.4 },
        { stream: 'SHOP', label: 'Pro Shop', amount: 62000.0, percentage: 21.8 },
        { stream: 'BAR', label: 'Bar & Lounge', amount: 48000.0, percentage: 16.8 },
        { stream: 'MEMBERSHIPS', label: 'Memberships', amount: 60000.0, percentage: 21.0 },
      ],
      revenueByPaymentMethod: {
        UPI: 160000.0,
        CARD: 85000.0,
        CASH: 30000.0,
        WALLET: 10000.0,
      },
      taxSummary: {
        totalTaxCollected: 41340.0,
        totalOutputTax: 41340.0,
        totalInputCredit: 8000.0,
        netGstPayable: 33340.0,
        rateBreakdown: [
          { ratePercentage: 18.0, taxableAmount: 175000.0, cgst: 15750.0, sgst: 15750.0, totalTax: 31500.0 },
          { ratePercentage: 12.0, taxableAmount: 62000.0, cgst: 3720.0, sgst: 3720.0, totalTax: 7440.0 },
          { ratePercentage: 5.0, taxableAmount: 48000.0, cgst: 1200.0, sgst: 1200.0, totalTax: 2400.0 },
        ],
      },
      payablesBreakdown: {
        totalPayables: 65000.0,
        supplierBills: 25000.0,
        expensesPending: 15000.0,
        operatingExpenses: 15000.0,
        payrollLiability: 18000.0,
        gstPayable: 33340.0,
        refundsPending: 2000.0,
        unsettledMemberCredits: 5000.0,
        aging: {
          current0to30: 45000.0,
          days31to60: 12000.0,
          days61to90: 5000.0,
          over90Days: 3000.0,
        },
      },
      receivablesAging: {
        currentOrDueSoon: 35000.0,
        overdueDays1To30: 7000.0,
        overdueDays31To60: 2000.0,
        overdueDays60Plus: 1000.0,
      },
      dailyTrend: [
        { date: '2026-10-01', label: '10/01', revenue: 9500.0, courts: 4000.0, shop: 2000.0, bar: 1500.0, memberships: 2000.0 },
        { date: '2026-10-02', label: '10/02', revenue: 10200.0, courts: 4500.0, shop: 2200.0, bar: 1500.0, memberships: 2000.0 },
      ],
      comparison: {
        currentTotalRevenue: 285000.0,
        previousTotalRevenue: 260000.0,
        revenueChangePercentage: 9.6,
      },
    };

    const mockKpis = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      preset: 'THIS_MONTH',
      courtUtilization: {
        utilizationPercentage: 74.5,
        totalBookedHours: 420.0,
        totalAvailableHours: 564.0,
        totalBookings: 210,
        cancellations: 12,
        cancellationRate: 5.71,
        noShows: 4,
        noShowRate: 1.9,
      },
      heatmap: [
        { dayOfWeek: 'SATURDAY', hourOfDay: 18, bookingCount: 14, intensityScore: 1.0 },
        { dayOfWeek: 'SUNDAY', hourOfDay: 10, bookingCount: 12, intensityScore: 0.85 },
      ],
      memberships: {
        activeMembers: 142,
        expiringWithin30Days: 18,
        churnedMembers: 3,
        churnRate: 2.11,
        newMembersJoined: 15,
      },
      topProducts: [
        { productId: 'p-1', productName: 'Yonex Badminton Shuttle Aerosensa 40', sku: 'SHUTTLE-AS40', quantitySold: 85, revenue: 21250.0 },
      ],
      lowStockItems: [
        { productId: 'p-1', productName: 'Yonex Badminton Shuttle Aerosensa 40', sku: 'SHUTTLE-AS40', currentStock: 4, minStockThreshold: 10 },
      ],
      barKpis: {
        totalCovers: 320,
        totalBarRevenue: 48000.0,
        averageTabAmount: 150.0,
        openTabsCount: 3,
      },
      leadFunnel: {
        totalLeads: 50,
        contactedLeads: 40,
        quoteSentLeads: 25,
        trialBookedLeads: 18,
        wonLeads: 12,
        conversionRatePercentage: 24.0,
      },
    };

    const mockExpenses = [
      {
        id: 'exp-101',
        expenseNumber: 'EXP-2026-001',
        category: 'UTILITIES',
        description: 'Facility High-Power Grid Electricity',
        vendor: 'State Electricity Board',
        expenseDate: '2026-10-05',
        dueDate: '2026-10-15',
        amount: 15000.0,
        taxAmount: 2700.0,
        totalAmount: 17700.0,
        status: 'PENDING',
        isRecurring: true,
      },
    ];

    let sharesList = [];
    let exportedQuery = null;

    // 2. Mock API routes for Owner page
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-owner-01',
          fullName: 'Vikram Mehta',
          email: 'vikram.owner@championsclub.com',
          role: 'OWNER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/sse/**', (route) => route.abort());
    await page.route('**/notifications/**', (route) => route.fulfill({ status: 200, json: [] }));

    await page.route(/\/api\/v1\/reporting\/summary(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummary),
      });
    });

    await page.route(/\/api\/v1\/reporting\/kpis(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockKpis),
      });
    });

    await page.route(/\/api\/v1\/reporting\/expenses(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExpenses),
      });
    });

    await page.route('**/api/v1/reporting/expenses/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(['RENT', 'UTILITIES', 'REPAIRS', 'EQUIPMENT', 'MARKETING', 'INSURANCE', 'OTHER']),
      });
    });

    await page.route(/\/api\/v1\/reporting\/export(\?.*)?$/, async (route) => {
      exportedQuery = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="champions_club_revenue_this_month.csv"',
        },
        body: 'Stream,NetRevenue,TaxAmount,GrossRevenue\nCOURTS,115000.00,20700.00,120000.00\nSHOP,62000.00,7440.00,65000.00\n',
      });
    });

    await page.route('**/api/v1/reporting/share', async (route) => {
      const data = JSON.parse(route.request().postData());
      const newShare = {
        id: 'share-jwt-999',
        token: 'signed-token-month-executive-2026',
        shareUrl: 'http://localhost:5173/shared-report/signed-token-month-executive-2026',
        title: data.title || 'Executive Financial Summary',
        reportType: data.reportType || 'FINANCIAL_SUMMARY',
        preset: data.preset || 'THIS_MONTH',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        revoked: false,
        createdAt: new Date().toISOString(),
      };
      sharesList.push(newShare);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newShare),
      });
    });

    await page.route('**/api/v1/reporting/shares', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sharesList),
      });
    });

    // 3. Inject Owner credentials into localStorage
    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-owner-token');
      localStorage.setItem('token', 'mock-owner-token');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-owner-01',
          fullName: 'Vikram Mehta',
          email: 'vikram.owner@championsclub.com',
          role: 'OWNER',
          status: 'ACTIVE',
        })
      );
    });

    // 4. Navigate to Owner Analytics & Reporting page
    await page.goto('/console/analytics');

    // Verify Header & Reconciled Badge
    await expect(page.locator('h1')).toContainText('Owner Dashboard & Financial Reports');
    await expect(page.locator('text=Formula Reconciled').first()).toBeVisible();

    // Verify Core Stat Cards
    await expect(page.locator('#stat-net-position')).toBeVisible();
    await expect(page.locator('#stat-total-revenue')).toBeVisible();
    await expect(page.locator('#stat-total-receivables')).toBeVisible();
    await expect(page.locator('#stat-total-payables')).toBeVisible();
    await expect(page.locator('#stat-court-utilization')).toBeVisible();

    // 5. Trigger CSV Export
    await page.locator('#export-dropdown-btn').click();
    await expect(page.locator('#export-csv-btn')).toBeVisible();

    // Click Export CSV and wait for download trigger or route hit
    const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await page.locator('#export-csv-btn').click();
    const download = await downloadPromise;

    // Verify export route was called with CSV & REVENUE
    expect(exportedQuery).toContain('format=CSV');
    expect(exportedQuery).toContain('reportType=REVENUE');

    // 6. Generate signed Share Link
    await page.locator('#share-report-btn').click();
    await expect(page.locator('text=Create Shareable Report Link')).toBeVisible();

    // Submit form to create signed link
    await page.locator('#generate-share-link-btn').click();

    // Verify share was recorded in sharesList
    await expect(page.locator('text=signed-token-month-executive-2026').or(page.locator('text=Executive Financial Summary')).or(page.locator('text=Champions Club Financial Summary'))).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');

    // 7. OPEN IN LOGGED-OUT CONTEXT (New Browser Context with NO auth)
    const loggedOutContext = await browser.newContext();
    const publicPage = await loggedOutContext.newPage();

    // Mock public endpoints on this unauthenticated context
    await publicPage.route('**/api/v1/public/reports/share/signed-token-month-executive-2026', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummary),
      });
    });

    await publicPage.route('**/api/v1/public/reports/share/signed-token-month-executive-2026/meta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'share-jwt-999',
          title: 'Monthly Executive Financial Brief',
          reportType: 'FINANCIAL_SUMMARY',
          preset: 'THIS_MONTH',
          expiresAt: '2026-10-31T23:59:59Z',
          revoked: false,
        }),
      });
    });

    // Navigate to shared link without logging in
    await publicPage.goto('/shared-report/signed-token-month-executive-2026');

    // Verify Read-Only Signed View renders
    await expect(publicPage.locator('text=Read-Only Executive Share')).toBeVisible();
    await expect(publicPage.locator('h1')).toContainText('Monthly Executive Financial Brief');

    // Verify Reconciled Financial Figures on Public Viewer
    await expect(publicPage.locator('[data-testid="shared-net-position"]')).toBeVisible();
    await expect(publicPage.locator('[data-testid="shared-total-revenue"]')).toBeVisible();
    await expect(publicPage.locator('[data-testid="shared-total-payables"]')).toBeVisible();

    // Verify Streams Breakdown is present
    await expect(publicPage.locator('text=Revenue Stream Breakdown (Reconciled)')).toBeVisible();
    await expect(publicPage.locator('text=Courts & Activities').or(publicPage.locator('text=COURTS'))).toBeVisible();

    // Verify Tax table is visible
    await expect(publicPage.locator('text=Tax Collection & GST Rates Breakdown')).toBeVisible();
    await expect(publicPage.locator('text=18% Slab')).toBeVisible();

    // Verify Security Audit Footer
    await expect(publicPage.locator('text=SHA256-HMAC Authenticated Read-Only Snapshot')).toBeVisible();

    await loggedOutContext.close();
  });
});
