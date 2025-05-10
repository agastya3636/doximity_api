import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export default async function handler(req, res) {
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
    console.error("Error in API:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
