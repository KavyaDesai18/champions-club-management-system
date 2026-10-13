const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots/surface_2_member');
const ARTIFACTS_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/b2c25d83-1376-46af-adee-dc0b846f9a41';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function setupMemberAuth(page) {
  // Comprehensive interceptor for all API endpoints
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
            id: 'usr-alex',
            memberId: 'mem-alex-01',
            fullName: 'Alex Rodriguez',
            email: 'alex@championsclub.com',
            role: 'MEMBER',
            memberNo: 'CC-001000',
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

      if (url.includes('/memberships/me/active') || url.includes('/memberships/my-active')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              id: 'MEM-VIP-9901',
              memberId: 'mem-alex-01',
              fullName: 'Alex Rodriguez',
              memberNo: 'CC-001000',
              planCode: 'GOLD',
              planName: 'Gold Tier VIP',
              status: 'ACTIVE',
              startDate: '2026-01-01',
              endDate: '2026-12-31',
              pricePaid: 1200.0,
            },
          }),
        });
      }

      if (url.includes('/sports')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify([
            { id: 'sport-1', name: 'Badminton', defaultSlotMinutes: 60 },
            { id: 'sport-2', name: 'Tennis', defaultSlotMinutes: 60 },
            { id: 'sport-3', name: 'Squash', defaultSlotMinutes: 45 },
            { id: 'sport-4', name: 'Padel', defaultSlotMinutes: 60 },
          ]),
        });
      }

      if (url.includes('/availability')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            date: '2026-10-13',
            clubTimezone: 'Asia/Kolkata',
            courts: [
              {
                courtId: 'court-101',
                courtName: 'Centre Court 1 (Championship Glass)',
                sportName: 'Badminton',
                surface: 'TARAFLEX',
                slots: [
                  {
                    startTime: '2026-10-13T10:00:00Z',
                    endTime: '2026-10-13T11:00:00Z',
                    localStartTime: '10:00',
                    localEndTime: '11:00',
                    state: 'AVAILABLE',
                    price: 350.0,
                    formattedPrice: '₹350',
                  },
                  {
                    startTime: '2026-10-13T11:00:00Z',
                    endTime: '2026-10-13T12:00:00Z',
                    localStartTime: '11:00',
                    localEndTime: '12:00',
                    state: 'BOOKED',
                    price: 350.0,
                    formattedPrice: '₹350',
                  },
                  {
                    startTime: '2026-10-13T12:00:00Z',
                    endTime: '2026-10-13T13:00:00Z',
                    localStartTime: '12:00',
                    localEndTime: '13:00',
                    state: 'HELD',
                    price: 350.0,
                    formattedPrice: '₹350',
                  },
                  {
                    startTime: '2026-10-13T13:00:00Z',
                    endTime: '2026-10-13T14:00:00Z',
                    localStartTime: '13:00',
                    localEndTime: '14:00',
                    state: 'AVAILABLE',
                    price: 350.0,
                    formattedPrice: '₹350',
                  },
                ],
              },
              {
                courtId: 'court-102',
                courtName: 'Grand Slam Court 2 (Olympic Cushion)',
                sportName: 'Badminton',
                surface: 'TARAFLEX',
                slots: [
                  {
                    startTime: '2026-10-13T10:00:00Z',
                    endTime: '2026-10-13T11:00:00Z',
                    localStartTime: '10:00',
                    localEndTime: '11:00',
                    state: 'AVAILABLE',
                    price: 350.0,
                    formattedPrice: '₹350',
                  },
                  {
                    startTime: '2026-10-13T11:00:00Z',
                    endTime: '2026-10-13T12:00:00Z',
                    localStartTime: '11:00',
                    localEndTime: '12:00',
                    state: 'SOCIAL',
                    price: 200.0,
                    formattedPrice: '₹200',
                  },
                  {
                    startTime: '2026-10-13T12:00:00Z',
                    endTime: '2026-10-13T13:00:00Z',
                    localStartTime: '12:00',
                    localEndTime: '13:00',
                    state: 'AVAILABLE',
                    price: 350.0,
                    formattedPrice: '₹350',
                  },
                ],
              },
              {
                courtId: 'court-103',
                courtName: 'Red Clay Court 3 (Roland Garros)',
                sportName: 'Tennis',
                surface: 'CLAY',
                slots: [
                  {
                    startTime: '2026-10-13T10:00:00Z',
                    endTime: '2026-10-13T11:00:00Z',
                    localStartTime: '10:00',
                    localEndTime: '11:00',
                    state: 'AVAILABLE',
                    price: 450.0,
                    formattedPrice: '₹450',
                  },
                  {
                    startTime: '2026-10-13T11:00:00Z',
                    endTime: '2026-10-13T12:00:00Z',
                    localStartTime: '11:00',
                    localEndTime: '12:00',
                    state: 'BOOKED',
                    price: 450.0,
                    formattedPrice: '₹450',
                  },
                ],
              },
            ],
          }),
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
    localStorage.setItem('champions_token', 'mock-valid-jwt');
    localStorage.setItem('champions_refresh_token', 'mock-valid-refresh');
    localStorage.setItem(
      'champions_user',
      JSON.stringify({
        id: 'usr-alex',
        memberId: 'mem-alex-01',
        fullName: 'Alex Rodriguez',
        email: 'alex@championsclub.com',
        role: 'MEMBER',
        memberNo: 'CC-001000',
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
    await setupMemberAuth(page);

    // Set Dark Theme
    await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const darkDashPath = path.join(OUTPUT_DIR, 'member_dashboard_dark_1440px.png');
    await page.screenshot({ path: darkDashPath });
    fs.copyFileSync(darkDashPath, path.join(ARTIFACTS_DIR, 'member_dashboard_dark_1440px.png'));
    console.log('Captured 1440px Member Dashboard Dark');

    // Set Light Theme
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const lightDashPath = path.join(OUTPUT_DIR, 'member_dashboard_light_1440px.png');
    await page.screenshot({ path: lightDashPath });
    fs.copyFileSync(lightDashPath, path.join(ARTIFACTS_DIR, 'member_dashboard_light_1440px.png'));
    console.log('Captured 1440px Member Dashboard Light');

    // Court Booking Page in Dark Mode
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.goto('http://localhost:5173/app/book', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const darkBookPath = path.join(OUTPUT_DIR, 'member_booking_grid_1440px.png');
    await page.screenshot({ path: darkBookPath });
    fs.copyFileSync(darkBookPath, path.join(ARTIFACTS_DIR, 'member_booking_grid_1440px.png'));
    console.log('Captured 1440px Court Booking Grid');

    // Click available slot to open Price Breakdown Drawer
    const availBtn = await page.locator('button:has-text("AVAILABLE")').first();
    if (await availBtn.isVisible()) {
      await availBtn.click();
      await page.waitForTimeout(600);
      const drawerPath = path.join(OUTPUT_DIR, 'member_price_breakdown_drawer_1440px.png');
      await page.screenshot({ path: drawerPath });
      fs.copyFileSync(drawerPath, path.join(ARTIFACTS_DIR, 'member_price_breakdown_drawer_1440px.png'));
      console.log('Captured 1440px Price Breakdown Drawer');
    }

    await context.close();
  }

  // 2. Mobile 390px (Designed for Thumbs)
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await setupMemberAuth(page);

    // Dark Mode Mobile Dashboard with thumb navigation
    await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const darkMobDash = path.join(OUTPUT_DIR, 'member_dashboard_dark_390px.png');
    await page.screenshot({ path: darkMobDash });
    fs.copyFileSync(darkMobDash, path.join(ARTIFACTS_DIR, 'member_dashboard_dark_390px.png'));
    console.log('Captured 390px Mobile Member Dashboard Dark');

    // Mobile Booking Grid with thumb tabs
    await page.goto('http://localhost:5173/app/book', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const darkMobBook = path.join(OUTPUT_DIR, 'member_booking_grid_dark_390px.png');
    await page.screenshot({ path: darkMobBook });
    fs.copyFileSync(darkMobBook, path.join(ARTIFACTS_DIR, 'member_booking_grid_dark_390px.png'));
    console.log('Captured 390px Mobile Booking Grid');

    await context.close();
  }

  await browser.close();
  console.log('Surface 2 capture complete!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
