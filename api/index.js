import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import scrapeProfiles from "../scrapeService.js"; // Adjust the path if needed

export default async function handler(req, res) {
  if (req.method === "GET" && req.url === "/") {
    // Puppeteer example route
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: [...chromium.args, '--disable-gpu', '--single-process', '--no-zygote'],
      });

      const page = await browser.newPage();
      await page.goto("https://example.com");
      const title = await page.title();

      res.status(200).json({
        message: "API is working!",
        title: title,
      });
    } catch (error) {
      console.error("Error in Puppeteer route:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

  } else if (req.method === "POST" && req.url === "/scrape") {
    // Scrape service route
    try {
      const { specialty, location } = req.body;

      if (!specialty || !location) {
        res.status(400).json({ error: "Please provide both specialty and location" });
        return;
      }

      const profiles = await scrapeProfiles({ specialty, location });

      res.status(200).json({
        message: "Scraping successful",
        data: profiles,
      });
    } catch (error) {
      console.error("Error in /scrape route:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }

  } else {
    // Fallback for undefined routes
    res.status(404).json({ error: "Route not found" });
  }
}
