const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots/surface_3_console');
const ARTIFACTS_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/b2c25d83-1376-46af-adee-dc0b846f9a41';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function setupStaffAuth(page) {
  // Catch-all route handler for backend API calls
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
            id: 'usr-staff-01',
            memberId: 'mem-staff-01',
            fullName: 'Marcus Vance',
            email: 'marcus@championsclub.com',
            role: 'FRONT_DESK',
            memberNo: 'CC-STAFF01',
          }),
        });
      }

      if (url.includes('/notifications/unread-count')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(4),
        });
      }

      if (url.includes('/plans')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            success: true,
            data: [
              { code: 'GOLD', name: 'Gold Champion VIP' },
              { code: 'SILVER', name: 'Silver All-Weather' },
              { code: 'JUNIOR', name: 'Junior Cadet Academy' },
            ],
          }),
        });
      }

      if (url.includes('/members/search') || url.includes('/members')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              content: [
                {
                  id: 'mem-101',
                  memberNo: 'CC-001000',
                  fullName: 'Alexander Zverev',
                  phone: '+91 98765 43210',
                  email: 'alex.z@championsclub.com',
                  age: 27,
                  planCode: 'GOLD',
                  status: 'ACTIVE',
                },
                {
                  id: 'mem-102',
                  memberNo: 'CC-001001',
                  fullName: 'Carlos Alcaraz',
                  phone: '+91 98765 43211',
                  email: 'carlos@championsclub.com',
                  age: 21,
                  planCode: 'GOLD',
                  status: 'ACTIVE',
                },
                {
                  id: 'mem-103',
                  memberNo: 'CC-001002',
                  fullName: 'Emma Raducanu',
                  phone: '+91 98765 43212',
                  email: 'emma.r@championsclub.com',
                  age: 22,
                  planCode: 'SILVER',
                  status: 'ACTIVE',
                },
                {
                  id: 'mem-104',
                  memberNo: 'CC-001003',
                  fullName: 'Leo Chen (Junior)',
                  phone: '+91 98765 43213',
                  email: 'parent.chen@gmail.com',
                  age: 12,
                  guardianName: 'David Chen',
                  planCode: 'JUNIOR',
                  status: 'ACTIVE',
                },
                {
                  id: 'mem-105',
                  memberNo: 'CC-000892',
                  fullName: 'Novak Djokovic',
                  phone: '+91 98765 43214',
                  email: 'novak@championsclub.com',
                  age: 38,
                  planCode: 'GOLD',
                  status: 'SUSPENDED',
                },
                {
                  id: 'mem-106',
                  memberNo: 'CC-000780',
                  fullName: 'Serena Williams',
                  phone: '+91 98765 43215',
                  email: 'serena@championsclub.com',
                  age: 42,
                  planCode: 'GOLD',
                  status: 'EXPIRED',
                },
              ],
              totalPages: 3,
              totalElements: 42,
            },
          }),
        });
      }

      if (url.includes('/courts')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify([
            { id: 'crt-1', name: 'Centre Court 1 (Glass)', sportType: 'BADMINTON' },
            { id: 'crt-2', name: 'Court 2 (Cushion)', sportType: 'BADMINTON' },
            { id: 'crt-3', name: 'Roland Garros Red Clay', sportType: 'TENNIS' },
            { id: 'crt-4', name: 'Plexipave Hard Court 1', sportType: 'TENNIS' },
          ]),
        });
      }

      if (url.includes('/bookings')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify([
            {
              id: 'bk-101',
              bookingReference: 'CC-BK-991A82',
              courtName: 'Centre Court 1 (Glass)',
              memberName: 'Alexander Zverev',
              memberNo: 'CC-001000',
              startTime: '2026-10-13T10:00:00Z',
              endTime: '2026-10-13T11:00:00Z',
              source: 'ONLINE',
              price: 35.0,
              status: 'CONFIRMED',
            },
            {
              id: 'bk-102',
              bookingReference: 'CC-BK-991A83',
              courtName: 'Roland Garros Red Clay',
              memberName: 'Carlos Alcaraz',
              memberNo: 'CC-001001',
              startTime: '2026-10-13T11:00:00Z',
              endTime: '2026-10-13T12:00:00Z',
              source: 'FRONT_DESK',
              price: 45.0,
              status: 'CONFIRMED',
            },
            {
              id: 'bk-103',
              bookingReference: 'CC-BK-991A84',
              courtName: 'Court 2 (Cushion)',
              memberName: 'Walk-In Guest (Rajesh K.)',
              guestPhone: '+91 98888 77777',
              startTime: '2026-10-13T11:30:00Z',
              endTime: '2026-10-13T12:30:00Z',
              source: 'WALK_IN',
              price: 30.0,
              status: 'HELD',
            },
          ]),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    return route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem('champions_token', 'mock-staff-jwt');
    localStorage.setItem('champions_refresh_token', 'mock-staff-refresh');
    localStorage.setItem(
      'champions_user',
      JSON.stringify({
        id: 'usr-staff-01',
        memberId: 'mem-staff-01',
        fullName: 'Marcus Vance',
        email: 'marcus@championsclub.com',
        role: 'FRONT_DESK',
        memberNo: 'CC-STAFF01',
      })
    );
  });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1440px
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await setupStaffAuth(page);

    // Dark Mode Operations Board
    await page.goto('http://localhost:5173/console', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const darkOpsPath = path.join(OUTPUT_DIR, 'console_operations_board_dark_1440px.png');
    await page.screenshot({ path: darkOpsPath });
    fs.copyFileSync(darkOpsPath, path.join(ARTIFACTS_DIR, 'console_operations_board_dark_1440px.png'));
    console.log('Captured 1440px Staff Operations Board Dark');

    // Light Mode Operations Board
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const lightOpsPath = path.join(OUTPUT_DIR, 'console_operations_board_light_1440px.png');
    await page.screenshot({ path: lightOpsPath });
    fs.copyFileSync(lightOpsPath, path.join(ARTIFACTS_DIR, 'console_operations_board_light_1440px.png'));
    console.log('Captured 1440px Staff Operations Board Light');

    // Members Directory Dense Table (Dark Mode)
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.goto('http://localhost:5173/console/members', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const darkMembersPath = path.join(OUTPUT_DIR, 'console_members_directory_dense_table_1440px.png');
    await page.screenshot({ path: darkMembersPath });
    fs.copyFileSync(darkMembersPath, path.join(ARTIFACTS_DIR, 'console_members_directory_dense_table_1440px.png'));
    console.log('Captured 1440px Members Directory Dense Table Dark');

    // Open Command Palette modal
    const paletteBtn = page.locator('button:has-text("Command palette...")').first();
    if (await paletteBtn.isVisible()) {
      await paletteBtn.click();
      await page.waitForTimeout(600);
      const palettePath = path.join(OUTPUT_DIR, 'console_command_palette_modal_1440px.png');
      await page.screenshot({ path: palettePath });
      fs.copyFileSync(palettePath, path.join(ARTIFACTS_DIR, 'console_command_palette_modal_1440px.png'));
      console.log('Captured 1440px Command Palette Modal');
    }

    await context.close();
  }

  // 2. Tablet 768px (Staff on iPad / Surface)
  {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupStaffAuth(page);

    await page.goto('http://localhost:5173/console', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tabOpsPath = path.join(OUTPUT_DIR, 'console_operations_board_tablet_768px.png');
    await page.screenshot({ path: tabOpsPath });
    fs.copyFileSync(tabOpsPath, path.join(ARTIFACTS_DIR, 'console_operations_board_tablet_768px.png'));
    console.log('Captured 768px Tablet Staff Operations Board');

    await context.close();
  }

  // 3. Mobile 390px (Quick Staff Directory on Phone)
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await setupStaffAuth(page);

    await page.goto('http://localhost:5173/console/members', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const mobMembersPath = path.join(OUTPUT_DIR, 'console_members_dense_table_mobile_390px.png');
    await page.screenshot({ path: mobMembersPath });
    fs.copyFileSync(mobMembersPath, path.join(ARTIFACTS_DIR, 'console_members_dense_table_mobile_390px.png'));
    console.log('Captured 390px Mobile Members Table');

    await context.close();
  }

  await browser.close();
  console.log('Surface 3 capture complete!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
