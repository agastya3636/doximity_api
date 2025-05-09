import express from 'express';
import dotenv from 'dotenv';
import scrapeProfiles from './scrapeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { specialty, location } = req.body;

  if (!specialty || !location) {
    return res.status(400).json({ status: 'error', message: 'Missing specialty or location' });
  }

  try {
    const profiles = await scrapeProfiles({ specialty, location });
    return res.status(200).json({ status: 'success', results: profiles });
  } catch (error) {
    // Log only; avoid another res.json if already sent
    console.error('❌ Scraping failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({ status: 'error', message: 'Failed to scrape profiles' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
