import express from 'express';
import dotenv from 'dotenv';
import scrapeProfiles from './scrapeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Quick response while scraping is in progress
app.post('/scrape', async (req, res) => {
  const { specialty, location } = req.body;

  if (!specialty || !location) {
    return res.status(400).json({ error: 'Missing specialty or location' });
  }

  // Send a quick response while scraping in the background
  res.json({ status: 'in_progress', message: 'Scraping started, results will be processed.' });

  try {
    const result = await scrapeProfiles({ specialty, location });
    console.log(result);
    // Return the scraped results after processing
    res.json({ status: 'success', profiles: result });
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    res.status(500).json({ error: 'Failed to scrape profiles' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
