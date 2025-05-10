import express from "express";
import scrapeProfiles from "./scrapeService.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🟢 Puppeteer scraper is running.");
});

app.post("/scrape", async (req, res) => {
  const { specialty, location } = req.body;

  if (!specialty || !location) {
    return res.status(400).json({ error: "Missing specialty or location" });
  }

  try {
    const profiles = await scrapeProfiles({ specialty, location });
    res.json({ message: "Success", data: profiles });
  } catch (error) {
    console.error("❌ Scraping error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
