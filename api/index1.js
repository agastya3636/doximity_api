import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import scrapeProfiles from "../scrapeService.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();
      await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
      const title = await page.title();
      await browser.close();

      return res.status(200).json({ message: "API is working!", title });
    }

    if (req.method === "POST") {
      const { specialty, location } = req.body;

      if (!specialty || !location) {
        return res.status(400).json({ error: "Please provide both specialty and location" });
      }

      const profiles = await scrapeProfiles({ specialty, location });
      return res.status(200).json({ message: "Scraping successful", data: profiles });
    }

    return res.status(404).json({ error: "Route not found" });
  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
