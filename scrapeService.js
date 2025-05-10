import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import dotenv from 'dotenv';

dotenv.config();

const scrapeProfiles = async ({ specialty, location }) => {
  const keywordSearch = `${specialty} ${location}`.trim();

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    args: chromium.args,
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  const DOXIMITY_USERNAME = process.env.DOXIMITY_USERNAME;
  const DOXIMITY_PASSWORD = process.env.DOXIMITY_PASSWORD;

  try {
    console.log('🔐 Navigating to login page...');
    await page.goto('https://www.doximity.com/login', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="login"]', { timeout: 15000 });
    await page.type('input[name="login"]', DOXIMITY_USERNAME, { delay: 100 });
    await page.type('input[name="password"]', DOXIMITY_PASSWORD, { delay: 100 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Check login success
    const currentUrl = page.url();
    if (!currentUrl.includes('talent_finder')) {
      console.warn('⚠️ Login may not have redirected properly, attempting manual navigation.');
      await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle2' });
    }

    console.log('✅ Logged in, navigating to search page...');
    await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle2' });

    console.log(`🔍 Waiting for search input...`);
    await page.waitForSelector('input[type="search"]', { timeout: 10000 });

    // Try fallback in case data-sel-q is missing
    const inputSelector = 'input[type="search"][data-sel-q]' 
      || 'input[type="search"]';

    await page.click(inputSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(inputSelector, keywordSearch);
    await page.keyboard.press('Enter');

    console.log(`🔍 Searching for: "${keywordSearch}"...`);
    await page.waitForSelector('.resultrow', { timeout: 8000 });

    const profiles = await page.$$eval('.resultrow', rows =>
      rows.slice(0, 15).map(row => {
        const name = row.querySelector('h2 a')?.innerText.trim() || null;
        const specialty = row.querySelector('.specialty')?.innerText.trim() || null;
        const location = row.querySelector('.location')?.innerText.trim() || null;
        const imageUrl = row.querySelector('img')?.src || null;
        const current = Array.from(row.querySelectorAll('li strong'))
          .find(el => el.innerText.includes('Current'))?.nextElementSibling?.innerText.trim() || null;
        const training = Array.from(row.querySelectorAll('li strong'))
          .find(el => el.innerText.includes('Training'))?.nextElementSibling?.innerText.trim() || null;
        const profileLink = row.querySelector('a')?.href || null;

        return { name, specialty, location, current, training, imageUrl, profileLink };
      })
    );

    console.log(`📁 Found ${profiles.length} profiles`);
    await browser.close();
    return profiles;
  } catch (err) {
    console.error('❌ Scraping failed:', err.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    await browser.close();
    throw new Error('Failed during scraping process');
  }
};

export default scrapeProfiles;
