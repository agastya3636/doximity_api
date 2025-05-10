import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define a sample API route
app.get("/", async (req, res) => {
  try {
    // Example Puppeteer usage: Fetch the title of a webpage
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Vercel serverless functions
    });
    const page = await browser.newPage();
    await page.goto("https://example.com");
    
    const title = await page.title();
    await browser.close();

    res.status(200).json({
      message: "API is working!",
      title: title,
    });
  } catch (error) {
    console.error("Error in API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server (for local development only)
if (process.env.NODE_ENV !== "production") {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
