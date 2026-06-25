import { Router } from 'express';
import { sqlQuery, callReducer, genId } from '../stdb.js';

const router = Router();

// GET /api/v1/search?q=...&collection_id=...&author_id=...&from=...&to=...
router.get('/', async (req, res, next) => {
  try {
    const { q, collection_id, author_id, from, to, limit: queryLimit } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Generate a unique search token
    const searchToken = genId('search');

    // Call the search reducer
    await callReducer('search_pages', [
      searchToken,
      q,
      collection_id || '',
      author_id || '',
      parseInt(from) || 0,
      parseInt(to) || 0,
    ]);

    // Fetch results
    const rows = await sqlQuery(
      `SELECT * FROM search_result WHERE search_token = '${searchToken}' ORDER BY created_at DESC`
    );

    // Map results
    const results = rows.map(r => ({
      id: String(r[0] ?? ''),
      search_token: String(r[1] ?? ''),
      page_id: String(r[2] ?? ''),
      title: String(r[3] ?? ''),
      slug: String(r[4] ?? ''),
      excerpt: String(r[5] ?? ''),
      match_type: String(r[6] ?? ''),
    }));

    const lim = parseInt(queryLimit) || 50;
    res.json({ data: results.slice(0, lim) });
  } catch (err) { next(err); }
});

export default router;
