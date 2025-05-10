import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import dotenv from 'dotenv';

dotenv.config();

const scrapeProfiles = async ({ specialty, location }) => {
  const keywordSearch = `${specialty} ${location}`.trim();
  const { DOXIMITY_USERNAME, DOXIMITY_PASSWORD } = process.env;

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    args: chromium.args,
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  try {
    console.log('🔐 Logging in...');
    await page.goto('https://www.doximity.com/login', { waitUntil: 'networkidle2' });

    await page.type('input[name="login"]', DOXIMITY_USERNAME);
    await page.type('input[name="password"]', DOXIMITY_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Logged in, navigating to search page...');
    await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000); // Let content render

    // Debug: log input fields to help identify the correct one
    const inputs = await page.$$eval('input', els =>
      els.map(el => ({
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        class: el.className,
        outerHTML: el.outerHTML,
      }))
    );
    console.log('🧪 Detected inputs:', inputs);

    // Try common selectors
    const possibleSelectors = [
      'input[type="search"][data-sel-q]',
      'input[placeholder*="Search"]',
      'input[type="search"]',
      'input'
    ];

    let inputSelector = null;
    for (const sel of possibleSelectors) {
      const exists = await page.$(sel);
      if (exists) {
        inputSelector = sel;
        break;
      }
    }

    if (!inputSelector) {
      throw new Error('No valid search input selector found.');
    }

    console.log(`🔍 Using selector: ${inputSelector}`);
    await page.click(inputSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(inputSelector, keywordSearch);
    await page.keyboard.press('Enter');

    console.log(`🔍 Searching for: "${keywordSearch}"...`);
    await page.waitForSelector('.resultrow', { timeout: 15000 });

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

    console.log(`📁 Scraped ${profiles.length} profiles`);
    await browser.close();
    return profiles;
  } catch (err) {
    console.error('❌ Scraping error:', err);
    await browser.close();
    throw new Error('Scraping failed');
  }
};

export default scrapeProfiles;
