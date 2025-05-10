import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import scrapeProfiles from "./scrape.js"; // Adjust this path if needed

export default async function handler(req, res) {
  const { method, url } = req;

  if (method === "GET" && url === "/") {
    // Puppeteer health check route
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: chromium.args,
      });

      const page = await browser.newPage();
      await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
      const title = await page.title();

      res.status(200).json({
        message: "API is working!",
        title,
      });
    } catch (error) {
      console.error("Error in Puppeteer route:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    } finally {
      if (browser) await browser.close();
    }
  } else if (method === "POST" && url === "/scrape") {
    // Scraping route
    try {
      // Ensure body parsing middleware is enabled
      const { specialty, location } = req.body;

      // Validate the incoming request data
      if (!specialty || !location) {
        res.status(400).json({ error: "Please provide both specialty and location" });
        return;
      }

      // Call scrapeProfiles to scrape the profiles
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
    // Handle unsupported HTTP methods or routes
    res.status(404).json({ error: "Route not found" });
  }
}
