import { Router } from 'express';
import { sqlQuery, callReducer, genId, mapPageTag } from '../stdb.js';

const router = Router();

// GET /api/v1/tags?page_id=... — List tags for a page (or all tags if no page_id)
router.get('/', async (req, res, next) => {
  try {
    const { page_id } = req.query;
    let sql = 'SELECT * FROM page_tag';
    if (page_id) sql += ` WHERE page_id = '${page_id}'`;
    sql += ' ORDER BY name ASC';
    const rows = await sqlQuery(sql);
    res.json({ data: rows.map(mapPageTag) });
  } catch (err) { next(err); }
});

// POST /api/v1/tags — Add a tag to a page
router.post('/', async (req, res, next) => {
  try {
    const { page_id, name, value } = req.body;
    if (!page_id || !name) {
      return res.status(400).json({ error: 'page_id and name are required' });
    }
    const id = genId('tag');
    await callReducer('add_tag', [id, page_id, name, value || '']);
    const rows = await sqlQuery(`SELECT * FROM page_tag WHERE id = '${id}'`);
    res.status(201).json({ data: rows.length ? mapPageTag(rows[0]) : { id } });
  } catch (err) { next(err); }
});

// DELETE /api/v1/tags/:id — Remove a tag
router.delete('/:id', async (req, res, next) => {
  try {
    await callReducer('remove_tag', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
