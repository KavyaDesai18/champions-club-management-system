const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots/surface_1_public');
const ARTIFACTS_DIR = 'C:/Users/Asus/.gemini/antigravity-ide/brain/b2c25d83-1376-46af-adee-dc0b846f9a41';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Dark Mode
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const darkVpPath = path.join(OUTPUT_DIR, 'public_home_dark_1440px.png');
    const darkFullPath = path.join(OUTPUT_DIR, 'public_home_dark_1440px_full.png');
    await page.screenshot({ path: darkVpPath });
    await page.screenshot({ path: darkFullPath, fullPage: true });

    fs.copyFileSync(darkVpPath, path.join(ARTIFACTS_DIR, 'public_home_dark_1440px.png'));
    fs.copyFileSync(darkFullPath, path.join(ARTIFACTS_DIR, 'public_home_dark_1440px_full.png'));
    console.log('Captured 1440px Dark');

    // Light Mode
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const lightVpPath = path.join(OUTPUT_DIR, 'public_home_light_1440px.png');
    const lightFullPath = path.join(OUTPUT_DIR, 'public_home_light_1440px_full.png');
    await page.screenshot({ path: lightVpPath });
    await page.screenshot({ path: lightFullPath, fullPage: true });

    fs.copyFileSync(lightVpPath, path.join(ARTIFACTS_DIR, 'public_home_light_1440px.png'));
    fs.copyFileSync(lightFullPath, path.join(ARTIFACTS_DIR, 'public_home_light_1440px_full.png'));
    console.log('Captured 1440px Light');

    // Trial Modal in 1440px Dark
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const trialBtn = await page.$('#hero-free-trial-btn');
    if (trialBtn) {
      await trialBtn.click();
      await page.waitForTimeout(600);
      const modalPath = path.join(OUTPUT_DIR, 'public_trial_modal_1440px.png');
      await page.screenshot({ path: modalPath });
      fs.copyFileSync(modalPath, path.join(ARTIFACTS_DIR, 'public_trial_modal_1440px.png'));
      console.log('Captured Trial Modal 1440px');
    }

    await context.close();
  }

  // 2. Mobile 390px
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Dark Mode
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const darkMobileVp = path.join(OUTPUT_DIR, 'public_home_dark_390px.png');
    const darkMobileFull = path.join(OUTPUT_DIR, 'public_home_dark_390px_full.png');
    await page.screenshot({ path: darkMobileVp });
    await page.screenshot({ path: darkMobileFull, fullPage: true });

    fs.copyFileSync(darkMobileVp, path.join(ARTIFACTS_DIR, 'public_home_dark_390px.png'));
    fs.copyFileSync(darkMobileFull, path.join(ARTIFACTS_DIR, 'public_home_dark_390px_full.png'));
    console.log('Captured 390px Dark');

    // Light Mode
    await page.evaluate(() => {
      localStorage.setItem('champions_theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const lightMobileVp = path.join(OUTPUT_DIR, 'public_home_light_390px.png');
    const lightMobileFull = path.join(OUTPUT_DIR, 'public_home_light_390px_full.png');
    await page.screenshot({ path: lightMobileVp });
    await page.screenshot({ path: lightMobileFull, fullPage: true });

    fs.copyFileSync(lightMobileVp, path.join(ARTIFACTS_DIR, 'public_home_light_390px.png'));
    fs.copyFileSync(lightMobileFull, path.join(ARTIFACTS_DIR, 'public_home_light_390px_full.png'));
    console.log('Captured 390px Light');

    await context.close();
  }

  await browser.close();
  console.log('Surface 1 capture complete!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
