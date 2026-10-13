const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots/surface_5_owner');
const ARTIFACTS_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/b2c25d83-1376-46af-adee-dc0b846f9a41';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
    payrollLiabilities: 18000.0,
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
    { date: '2026-10-03', label: '10/03', revenue: 11400.0, courts: 5000.0, shop: 2400.0, bar: 2000.0, memberships: 2000.0 },
    { date: '2026-10-04', label: '10/04', revenue: 13000.0, courts: 6000.0, shop: 2600.0, bar: 2400.0, memberships: 2000.0 },
    { date: '2026-10-05', label: '10/05', revenue: 14200.0, courts: 6500.0, shop: 2800.0, bar: 2900.0, memberships: 2000.0 },
    { date: '2026-10-06', label: '10/06', revenue: 15800.0, courts: 7200.0, shop: 3200.0, bar: 3400.0, memberships: 2000.0 },
    { date: '2026-10-07', label: '10/07', revenue: 16900.0, courts: 7800.0, shop: 3500.0, bar: 3600.0, memberships: 2000.0 },
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
  peakHoursHeatmap: [
    { dayOfWeek: 1, hour: 18, bookingCount: 14, intensity: 1.0 },
    { dayOfWeek: 2, hour: 19, bookingCount: 12, intensity: 0.85 },
    { dayOfWeek: 6, hour: 9, bookingCount: 16, intensity: 1.0 },
    { dayOfWeek: 6, hour: 10, bookingCount: 15, intensity: 0.95 },
    { dayOfWeek: 7, hour: 17, bookingCount: 14, intensity: 0.9 },
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
    { productId: 'p-2', productName: 'Grip Tape Pro 3-Pack', sku: 'GRIP-3P', quantitySold: 45, revenue: 4500.0 },
  ],
  lowStockItems: [
    { productId: 'p-1', productName: 'Yonex Badminton Shuttle Aerosensa 40', sku: 'SHUTTLE-AS40', currentStock: 4, status: 'LOW STOCK' },
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
    won: 12,
    conversionRatePercentage: 24.0,
  },
};

const mockExpenses = [
  { id: 'exp-1', expenseNumber: 'EXP-101', title: 'Monthly Court Electricity & Floodlights', description: 'Monthly Court Electricity & Floodlights', category: 'UTILITIES', amount: 15000.0, taxAmount: 2700.0, totalAmount: 17700.0, vendor: 'State Electricity Board', expenseDate: '2026-10-05', dueDate: '2026-10-15', status: 'PAID' },
  { id: 'exp-2', expenseNumber: 'EXP-102', title: 'Badminton Court 1 Resurfacing Polish', description: 'Badminton Court 1 Resurfacing Polish', category: 'REPAIRS', amount: 8000.0, taxAmount: 1440.0, totalAmount: 9440.0, vendor: 'Pro Flooring Solutions', expenseDate: '2026-10-08', dueDate: '2026-10-20', status: 'PENDING' },
];

async function setupOwnerMocks(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/v1/') || url.includes(':8081')) {
      const headers = { 'access-control-allow-origin': '*' };

      if (url.includes('/auth/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            id: 'usr-owner-01',
            memberId: 'mem-owner-01',
            fullName: 'Vikram Mehta',
            email: 'vikram.mehta@championsclub.com',
            role: 'OWNER',
            memberNo: 'CC-OWNER01',
          }),
        });
      }

      if (url.includes('/notifications/unread-count')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(3),
        });
      }

      if (url.includes('/reporting/summary')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockSummary),
        });
      }

      if (url.includes('/reporting/kpis')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockKpis),
        });
      }

      if (url.includes('/reporting/expenses/categories')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(['RENT', 'UTILITIES', 'REPAIRS', 'EQUIPMENT', 'MARKETING', 'INSURANCE', 'OTHER']),
        });
      }

      if (url.includes('/reporting/expenses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockExpenses),
        });
      }

      if (url.includes('/reporting/shares')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify([]),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-owner-jwt');
    localStorage.setItem('champions_token', 'mock-owner-jwt');
    localStorage.setItem('champions_refresh_token', 'mock-owner-refresh');
    localStorage.setItem(
      'champions_user',
      JSON.stringify({
        id: 'usr-owner-01',
        memberId: 'mem-owner-01',
        fullName: 'Vikram Mehta',
        email: 'vikram.mehta@championsclub.com',
        role: 'OWNER',
        memberNo: 'CC-OWNER01',
      })
    );
  });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1440px Dark Mode (Overview with Honest Charts & Single-Insight Cards)
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupOwnerMocks(page);

    await page.goto('http://localhost:5173/console/analytics', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(2000);

    const outPath = path.join(OUTPUT_DIR, 'owner_dashboard_dark_1440px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'owner_dashboard_dark_1440px.png'));
    console.log('Saved owner_dashboard_dark_1440px.png');
    await context.close();
  }

  // 2. Desktop 1440px Light Mode
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupOwnerMocks(page);

    await page.goto('http://localhost:5173/console/analytics', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(2000);

    const outPath = path.join(OUTPUT_DIR, 'owner_dashboard_light_1440px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'owner_dashboard_light_1440px.png'));
    console.log('Saved owner_dashboard_light_1440px.png');
    await context.close();
  }

  // 3. Tablet Viewport 768px (Responsive Hierarchy)
  {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupOwnerMocks(page);

    await page.goto('http://localhost:5173/console/analytics', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(2000);

    const outPath = path.join(OUTPUT_DIR, 'owner_dashboard_tablet_768px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'owner_dashboard_tablet_768px.png'));
    console.log('Saved owner_dashboard_tablet_768px.png');
    await context.close();
  }

  // 4. "What We Owe" Payables Tab (1440px)
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupOwnerMocks(page);

    await page.goto('http://localhost:5173/console/analytics', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(1000);

    // Click on Payables Tab
    const payablesBtn = page.locator('#tab-payables, button:has-text("What We Owe")').first();
    if (await payablesBtn.isVisible()) {
      await payablesBtn.click();
      await page.waitForTimeout(1500);
    }

    const outPath = path.join(OUTPUT_DIR, 'owner_dashboard_payables_1440px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'owner_dashboard_payables_1440px.png'));
    console.log('Saved owner_dashboard_payables_1440px.png');
    await context.close();
  }

  // 5. Operations & KPIs Tab (1440px) with Heatmap
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupOwnerMocks(page);

    await page.goto('http://localhost:5173/console/analytics', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(1000);

    // Click on KPIs Tab
    const kpisBtn = page.locator('#tab-kpis, button:has-text("Operations & KPIs")').first();
    if (await kpisBtn.isVisible()) {
      await kpisBtn.click();
      await page.waitForTimeout(1500);
    }

    const outPath = path.join(OUTPUT_DIR, 'owner_dashboard_kpis_1440px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'owner_dashboard_kpis_1440px.png'));
    console.log('Saved owner_dashboard_kpis_1440px.png');
    await context.close();
  }

  await browser.close();
  console.log('Surface 5 capture completed!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
