import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export default async function handler(req, res) {
  try {
    // Launch Puppeteer with a custom Chromium binary
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      args: chromium.args,
    });

    const page = await browser.newPage();
    await page.goto("https://example.com"); // Replace with your own logic
    const title = await page.title();

    await browser.close();

    // Respond with the result
    res.status(200).json({
      message: "API is working!",
      title: title,
    });
  } catch (error) {
    console.error("Error in API:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}