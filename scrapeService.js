import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export default async function scrapeProfiles({ specialty, location }) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  try {
    const searchUrl = `https://www.example-doctor-site.com/search?specialty=${encodeURIComponent(
      specialty
    )}&location=${encodeURIComponent(location)}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Change the selector to match the target site
    await page.waitForSelector(".profile-card", { timeout: 30000 });

    const profiles = await page.$$eval(".profile-card", cards =>
      cards.map(card => {
        const name = card.querySelector(".doctor-name")?.innerText || "";
        const title = card.querySelector(".doctor-title")?.innerText || "";
        const location = card.querySelector(".doctor-location")?.innerText || "";
        const profileLink = card.querySelector("a")?.href || "";
        return { name, title, location, profileLink };
      })
    );

    return profiles;
  } catch (error) {
    console.error("❌ Scraping error:", error.message);
    throw new Error("Failed to scrape profiles.");
  } finally {
    await browser.close();
  }
}
