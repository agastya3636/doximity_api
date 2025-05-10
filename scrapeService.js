import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

const scrapeProfiles = async ({ specialty, location }) => {
  const keywordSearch = `${specialty} ${location}`.trim();

  // Launch browser in headless mode for better speed
  const browser = await puppeteer.launch({
    headless: true, // Faster in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

    console.log('✅ Logged in, navigating to search page...');
    await page.goto('https://www.doximity.com/talent_finder/search', { waitUntil: 'networkidle2' });

    // Wait for search input and use a quicker method to perform the search
    await page.waitForSelector('input[type="search"][data-sel-q]', { timeout: 15000 });
    
    // Clear and type the search query
    await page.click('input[type="search"][data-sel-q]');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[type="search"][data-sel-q]', keywordSearch);
    await page.keyboard.press('Enter');

    console.log(`🔍 Searching for: "${keywordSearch}"...`);
    // Wait for results to load faster by targeting the result rows directly
    await page.waitForSelector('.resultrow', { timeout: 5000 });

    // Scrape top 10 results for faster response
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
    console.error('❌ Scraping failed:', err);
    await browser.close();
    throw new Error('Failed during scraping process');
  }
};

export default scrapeProfiles;
