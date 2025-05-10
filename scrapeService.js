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

    await page.type('input[name="login"]', DOXIMITY_USERNAME);
    await page.type('input[name="password"]', DOXIMITY_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Logged in, performing search...');
    await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle2' });

    await page.type('input[type="search"][data-sel-q]', keywordSearch);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.resultrow');

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
