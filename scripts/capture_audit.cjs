const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/audit-screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '390px', width: 390, height: 844 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 },
];

const SCREENS = [
  { slug: 'public_home', path: '/', auth: false },
  { slug: 'styleguide', path: '/styleguide', auth: false },
  { slug: 'member_dashboard', path: '/app', auth: true },
  { slug: 'member_booking', path: '/app/book', auth: true },
  { slug: 'member_my_bookings', path: '/app/bookings', auth: true },
  { slug: 'staff_console_home', path: '/console', auth: true },
  { slug: 'staff_members', path: '/console/members', auth: true },
  { slug: 'staff_bookings', path: '/console/bookings', auth: true },
  { slug: 'staff_courts', path: '/console/courts', auth: true },
  { slug: 'owner_dashboard', path: '/console/owner', auth: true },
  { slug: 'bar_pos', path: '/console/bar', auth: true },
  { slug: 'kitchen_display', path: '/console/kitchen', auth: true },
];

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Capturing for viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Perform Login to get auth state
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'owner@championsclub.com');
    await page.fill('input[type="password"]', 'Champions@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    for (const scr of SCREENS) {
      const url = `http://localhost:5173${scr.path}`;
      console.log(`Navigating to ${scr.slug} (${url})...`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        console.warn(`Timeout/warning loading ${url}, proceeding anyway: ${e.message}`);
      }
      await page.waitForTimeout(1500); // allow transitions and query renders

      const filename = `${scr.slug}_${vp.name}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false });
      console.log(`Saved: ${filename}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll audit screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
