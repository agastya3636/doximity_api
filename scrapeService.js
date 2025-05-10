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

  const { DOXIMITY_USERNAME, DOXIMITY_PASSWORD } = process.env;

  try {
    console.log('🔐 Logging in...');
    await page.goto('https://www.doximity.com/login', { waitUntil: 'networkidle2' });

    await page.type('input[name="login"]', DOXIMITY_USERNAME, { delay: 100 });
    await page.type('input[name="password"]', DOXIMITY_PASSWORD, { delay: 100 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Logged in, navigating to search page...');
    await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle2' });

    // Increase timeout and wait for another stable element
    await page.waitForSelector('.some-other-stable-element', { timeout: 30000 }); // Replace with an actual stable selector

    // Now wait for the search input
    await page.waitForSelector('input[type="search"]', { timeout: 30000 });

    const searchSelectors = [
      'input[type="search"]',
      'input[data-sel-q]',
      'input[placeholder*="Search"]',
    ];

    let foundSelector = null;
    for (const sel of searchSelectors) {
      const exists = await page.$(sel);
      if (exists) {
        foundSelector = sel;
        break;
      }
    }

    if (!foundSelector) {
      const html = await page.content();
      console.error('❌ Could not find search input. HTML snapshot:\n', html.slice(0, 1000));
      throw new Error('⚠️ Failed to find search input with known selectors.');
    }

    console.log(`✅ Found search input with selector: ${foundSelector}`);
    await page.click(foundSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(foundSelector, keywordSearch);
    await page.keyboard.press('Enter');

    console.log(`🔍 Searching for: "${keywordSearch}"...`);
    await page.waitForSelector('.resultrow', { timeout: 30000 });

    // Wait for 5 seconds to let results fully load
    await page.waitForSelector('.resultrow', { timeout: 5000 });

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
