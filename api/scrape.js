import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const scrapeProfiles = async ({ specialty, location }) => {
  const keywordSearch = `${specialty} ${location}`.trim();

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Block images and fonts
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  try {
    console.log('🔐 Logging in...');
    await page.goto('https://www.doximity.com/login', { waitUntil: 'networkidle0' });

    await page.type('input[name="login"]', process.env.DOXIMITY_USERNAME, { delay: 100 });
    await page.type('input[name="password"]', process.env.DOXIMITY_PASSWORD, { delay: 100 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    console.log('✅ Logged in, navigating to search...');
    await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle0' });

    const searchSelector = 'input[type="search"]';
    await page.waitForSelector(searchSelector, { timeout: 15000 });

    console.log('✅ Found search input, starting search...');
    await page.click(searchSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(searchSelector, keywordSearch);
    await page.keyboard.press('Enter');

    await page.waitForSelector('.resultrow', { timeout: 30000 });

    const profiles = await page.$$eval('.resultrow', (rows) =>
      rows.slice(0, 15).map((row) => {
        const name = row.querySelector('h2 a')?.innerText.trim() || null;
        const specialty = row.querySelector('.specialty')?.innerText.trim() || null;
        const location = row.querySelector('.location')?.innerText.trim() || null;
        const imageUrl = row.querySelector('img')?.src || null;
        const current = Array.from(row.querySelectorAll('li strong'))
          .find((el) => el.innerText.includes('Current'))?.nextElementSibling?.innerText.trim() || null;
        const training = Array.from(row.querySelectorAll('li strong'))
          .find((el) => el.innerText.includes('Training'))?.nextElementSibling?.innerText.trim() || null;
        const profileLink = row.querySelector('a')?.href || null;

        return { name, specialty, location, current, training, imageUrl, profileLink };
      })
    );

    console.log(`📁 Scraped ${profiles.length} profiles`);
    await browser.close();
    return profiles;
  } catch (err) {
    console.error('❌ Scraping error:', err);
    await page.screenshot({ path: '/tmp/scrape_error.png' });
    await browser.close();
    throw new Error(`Scraping failed: ${err.message}`);
  }
};

export default scrapeProfiles;
