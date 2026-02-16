const express = require('express');
const { check, validationResult } = require('express-validator');
const { sources } = require('../config/sources');


const router = express.Router();

// Validasi untuk konten chapter
const validateChapterContent = [
  check('seriesSlug').isString().matches(/^[a-z0-9-]+$/).trim(),
  check('chapterSlug').isString().matches(/^[a-z0-9.-]+$/).trim(),
  check('source').optional().isIn(Object.keys(sources))
];

/**
 * @swagger
 * tags:
 *   name: Chapters
 *   description: Chapter content retrieval
 */

/**
 * @swagger
 * /api/chapters/{seriesSlug}/{chapterSlug}:
 *   get:
 *     summary: Get chapter images
 *     tags: [Chapters]
 *     parameters:
 *       - in: path
 *         name: seriesSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: The comic slug
 *       - in: path
 *         name: chapterSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: The chapter slug
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [komikcast, kiryuu]
 *     responses:
 *       200:
 *         description: The chapter images
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     chapter:
 *                       type: object
 *                       properties:
 *                         chapterId: { type: string }
 *                         title: { type: string }
 *                         images: 
 *                           type: array
 *                           items: { type: string }
 *       404:
 *         description: Chapter not found
 */
// Endpoint untuk konten chapter
// Format: GET /api/chapters/:seriesSlug/:chapterSlug
// Query params: ?source=kiryuu
router.get('/:seriesSlug/:chapterSlug', validateChapterContent, async (req, res) => {
  // Validasi input
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid series slug, chapter slug, or source' });
  }

  try {
    const source = req.query.source || 'komikcast';
    const scraper = require(`../scrapers/${source}`);
    const chapter = await scraper.fetchChapterContent(req.params.seriesSlug, req.params.chapterSlug);

    res.json({ data: { chapter, source } });
  } catch (error) {
    if (error.message.includes('Tidak ada gambar ditemukan')) {
      res.status(404).json({ error: 'Chapter content empty or protected', details: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch chapter content', details: error.message });
    }
  }
});

module.exports = router;
