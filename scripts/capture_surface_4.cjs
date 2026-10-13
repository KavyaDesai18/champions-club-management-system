const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots/surface_4_pos_kds');
const ARTIFACTS_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/b2c25d83-1376-46af-adee-dc0b846f9a41';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const mockCategories = [
  { id: 'cat-1', name: 'Draft & Craft Beer' },
  { id: 'cat-2', name: 'Recovery Smoothies' },
  { id: 'cat-3', name: 'Kitchen & Grill' },
  { id: 'cat-4', name: 'Artisan Coffee' },
];

const mockMenuItems = [
  { id: 'item-1', categoryId: 'cat-1', name: 'Champions IPA 500ml', price: 340, isAvailable: true, stock: 48, prepStation: 'BAR', preparationStation: 'BAR', taxCategory: 'GST 18%' },
  { id: 'item-2', categoryId: 'cat-1', name: 'Crisp Pilsner 330ml', price: 280, isAvailable: true, stock: 32, prepStation: 'BAR', preparationStation: 'BAR', taxCategory: 'GST 18%' },
  { id: 'item-3', categoryId: 'cat-2', name: 'Electrolyte Citrus Fizz', price: 180, isAvailable: true, stock: 90, prepStation: 'BAR', preparationStation: 'BAR', taxCategory: 'GST 5%' },
  { id: 'item-4', categoryId: 'cat-2', name: 'Whey Protein Berry Blast', price: 260, isAvailable: true, stock: 40, prepStation: 'BAR', preparationStation: 'BAR', taxCategory: 'GST 5%' },
  { id: 'item-5', categoryId: 'cat-3', name: 'Club Sourdough Sandwich', price: 380, isAvailable: true, stock: 15, prepStation: 'KITCHEN', preparationStation: 'KITCHEN', taxCategory: 'GST 5%' },
  { id: 'item-6', categoryId: 'cat-3', name: 'Truffle Parmesan Fries', price: 240, isAvailable: true, stock: 25, prepStation: 'KITCHEN', preparationStation: 'KITCHEN', taxCategory: 'GST 5%' },
  { id: 'item-7', categoryId: 'cat-4', name: 'Double Espresso Tonic', price: 210, isAvailable: true, stock: 60, prepStation: 'BAR', preparationStation: 'BAR', taxCategory: 'GST 5%' },
];

const mockTables = [
  { id: 'tbl-1', label: 'T1', tableNumber: 'T1', seats: 4, capacity: 4, status: 'FREE', currentTabId: null, currentTabTotal: 0 },
  { id: 'tbl-2', label: 'T2', tableNumber: 'T2', seats: 6, capacity: 6, status: 'OCCUPIED', currentTabId: 'tab-101', currentTabTotal: 960 },
  { id: 'tbl-3', label: 'T3', tableNumber: 'T3', seats: 2, capacity: 2, status: 'OCCUPIED', currentTabId: 'tab-102', currentTabTotal: 480 },
  { id: 'tbl-4', label: 'T4', tableNumber: 'T4', seats: 8, capacity: 8, status: 'FREE', currentTabId: null, currentTabTotal: 0 },
  { id: 'tbl-5', label: 'Bar 1', tableNumber: 'Courtside Bar 1', seats: 2, capacity: 2, status: 'FREE', currentTabId: null, currentTabTotal: 0 },
  { id: 'tbl-6', label: 'Bar 2', tableNumber: 'Courtside Bar 2', seats: 2, capacity: 2, status: 'OCCUPIED', currentTabId: 'tab-103', currentTabTotal: 340 },
];

const mockTab101 = {
  id: 'tab-101',
  tabNumber: '101',
  status: 'OPEN',
  guestName: 'Alice Walker',
  tableId: 'tbl-2',
  tableNumber: 'T2',
  openedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  items: [
    { id: 'ti-1', menuItemId: 'item-1', name: 'Champions IPA 500ml', quantity: 2, unitPrice: 340, totalPrice: 680, status: 'SERVED' },
    { id: 'ti-2', menuItemId: 'item-6', name: 'Truffle Parmesan Fries', quantity: 1, unitPrice: 240, totalPrice: 240, status: 'PREPARING' },
  ],
  subtotal: 920,
  taxAmount: 40,
  totalAmount: 960,
};

const now = Date.now();
const mockTickets = [
  {
    id: 'tkt-501',
    ticketNumber: '501',
    tableNumber: 'T2',
    guestName: 'Alice Walker',
    status: 'IN_PREPARATION',
    station: 'KITCHEN',
    createdAt: new Date(now - 16 * 60 * 1000).toISOString(), // 16 mins ago -> urgent
    items: [
      { id: 'titem-1', name: 'Club Sourdough Sandwich', quantity: 2, notes: 'Toasted well, dressing on side', isDone: false },
      { id: 'titem-2', name: 'Truffle Parmesan Fries', quantity: 1, notes: 'Extra rosemary salt', isDone: true },
    ],
  },
  {
    id: 'tkt-502',
    ticketNumber: '502',
    tableNumber: 'T3',
    guestName: 'Rohan Mehta',
    status: 'PENDING',
    station: 'BAR',
    createdAt: new Date(now - 9 * 60 * 1000).toISOString(), // 9 mins ago -> warning
    items: [
      { id: 'titem-3', name: 'Champions IPA 500ml', quantity: 2, notes: 'Chilled glasses', isDone: false },
      { id: 'titem-4', name: 'Electrolyte Citrus Fizz', quantity: 1, notes: '', isDone: false },
    ],
  },
  {
    id: 'tkt-503',
    ticketNumber: '503',
    tableNumber: 'Courtside Bar 2',
    guestName: 'Court 1 Walk-in',
    status: 'PENDING',
    station: 'BAR',
    createdAt: new Date(now - 3 * 60 * 1000).toISOString(), // 3 mins ago -> fresh
    items: [
      { id: 'titem-5', name: 'Double Espresso Tonic', quantity: 2, notes: 'Double shot', isDone: false },
    ],
  },
];

async function setupMocks(page) {
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
            id: 'usr-bar-01',
            memberId: 'mem-bar-01',
            fullName: 'Vikram Sethi',
            email: 'vikram@championsclub.com',
            role: 'BAR_STAFF',
            memberNo: 'CC-BAR01',
          }),
        });
      }

      if (url.includes('/notifications/unread-count')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(2),
        });
      }

      if (url.includes('/bar/shifts/active')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            id: 'shift-today',
            station: 'BAR',
            status: 'OPEN',
            staffName: 'Vikram Sethi',
            openedAt: new Date(now - 4 * 3600 * 1000).toISOString(),
            openingCash: 2500,
            cashCollected: 7420,
            cardCollected: 18650,
            walletCollected: 5200,
            totalSales: 31270,
            carriedForwardCount: 1,
          }),
        });
      }

      if (url.includes('/bar/menu/categories')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockCategories),
        });
      }

      if (url.includes('/bar/menu/items')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockMenuItems),
        });
      }

      if (url.includes('/bar/tables/tbl-2') || url.includes('/bar/tabs/tab-101')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockTab101),
        });
      }

      if (url.includes('/bar/tables')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockTables),
        });
      }

      if (url.includes('/bar/tabs')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify([mockTab101]),
        });
      }

      if (url.includes('/bar/kitchen-display/active')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(mockTickets),
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
    localStorage.setItem('champions_token', 'mock-bar-jwt');
    localStorage.setItem('champions_refresh_token', 'mock-bar-refresh');
    localStorage.setItem(
      'champions_user',
      JSON.stringify({
        id: 'usr-bar-01',
        memberId: 'mem-bar-01',
        fullName: 'Vikram Sethi',
        email: 'vikram@championsclub.com',
        role: 'BAR_STAFF',
        memberNo: 'CC-BAR01',
      })
    );
  });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Bar POS on Tablet Viewport (768x1024)
  {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupMocks(page);

    await page.goto('http://localhost:5173/console/bar', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(1000);

    const outPath = path.join(OUTPUT_DIR, 'bar_pos_tablet_768px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'bar_pos_tablet_768px.png'));
    console.log('Saved bar_pos_tablet_768px.png');
    await context.close();
  }

  // 2. Bar POS on Desktop (1440x900) with Tab Selected & Order Staged
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupMocks(page);

    await page.goto('http://localhost:5173/console/bar', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(1000);

    // Click on table T2 (which has tab #101)
    const t2Btn = page.locator('button:has-text("T2")').first();
    if (await t2Btn.isVisible()) {
      await t2Btn.click();
      await page.waitForTimeout(1000);
    }

    const outPath = path.join(OUTPUT_DIR, 'bar_pos_tab_detail_1440px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'bar_pos_tab_detail_1440px.png'));
    console.log('Saved bar_pos_tab_detail_1440px.png');
    await context.close();
  }

  // 3. Kitchen Display (KDS) on Tablet Viewport (1024x768 landscape)
  {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupMocks(page);

    await page.goto('http://localhost:5173/console/kitchen', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(2000);

    const outPath = path.join(OUTPUT_DIR, 'kitchen_display_kds_tablet_1024px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'kitchen_display_kds_tablet_1024px.png'));
    console.log('Saved kitchen_display_kds_tablet_1024px.png');
    await context.close();
  }

  // 4. Kitchen Display (KDS) in Desktop Viewport (1440x900)
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupMocks(page);

    await page.goto('http://localhost:5173/console/kitchen', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(2000);

    const outPath = path.join(OUTPUT_DIR, 'kitchen_display_kds_dark_1440px.png');
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'kitchen_display_kds_dark_1440px.png'));
    console.log('Saved kitchen_display_kds_dark_1440px.png');
    await context.close();
  }

  await browser.close();
  console.log('Surface 4 capture completed!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
