const express = require('express');
const { check, validationResult } = require('express-validator');
const { sources } = require('../config/sources');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Popular
 *   description: Popular manga retrieval
 */

/**
 * @swagger
 * /api/popular-manga:
 *   get:
 *     summary: Get popular manga
 *     tags: [Popular]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [komikcast, kiryuu]
 *     responses:
 *       200:
 *         description: List of popular manga
 */
// Endpoint untuk manga populer
router.get('/', [
  check('source').optional().isIn(Object.keys(sources))
], async (req, res) => {
  // Validasi input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  try {
    const source = req.query.source || 'komikcast';
    const scraper = require(`../scrapers/${source}`);
    const popularMangaList = await scraper.fetchPopularManga(sources[source].baseUrl + sources[source].popularMangaUrl);
    res.json({ data: { popularManga: popularMangaList, source } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular manga' });
  }
});

module.exports = router;