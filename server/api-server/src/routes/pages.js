import { Router } from 'express';
import { sqlQuery, callReducer, genId, mapPage } from '../stdb.js';

const router = Router();

// GET /api/v1/pages — List pages (with optional collection_id, status filters)
router.get('/', async (req, res, next) => {
  try {
    const { collection_id, status, parent_page_id, limit, offset } = req.query;
    let sql = 'SELECT * FROM page';
    const conditions = [];

    if (collection_id) conditions.push(`collection_id = '${collection_id}'`);
    if (status) conditions.push(`status = '${status}'`);
    else conditions.push("status != 'deleted'");
    if (parent_page_id !== undefined) {
      if (parent_page_id === '') conditions.push("parent_page_id = ''");
      else conditions.push(`parent_page_id = '${parent_page_id}'`);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY sort_order ASC';

    const rows = await sqlQuery(sql);
    let pages = rows.map(mapPage);

    const lim = parseInt(limit) || 0;
    const off = parseInt(offset) || 0;
    if (off > 0) pages = pages.slice(off);
    if (lim > 0) pages = pages.slice(0, lim);

    res.json({ data: pages });
  } catch (err) { next(err); }
});

// GET /api/v1/pages/:id — Get a single page
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await sqlQuery(`SELECT * FROM page WHERE id = '${req.params.id}'`);
    if (rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ data: mapPage(rows[0]) });
  } catch (err) { next(err); }
});

// POST /api/v1/pages — Create a new page
router.post('/', async (req, res, next) => {
  try {
    const { title, content, collection_id, parent_page_id } = req.body;
    if (!title || !collection_id) {
      return res.status(400).json({ error: 'title and collection_id are required' });
    }
    const id = genId('page');
    await callReducer('create_page', [
      id, title, content || '', collection_id, parent_page_id || '', req.apiUser.id,
    ]);
    const rows = await sqlQuery(`SELECT * FROM page WHERE id = '${id}'`);
    res.status(201).json({ data: rows.length ? mapPage(rows[0]) : { id } });
  } catch (err) { next(err); }
});

// PUT /api/v1/pages/:id — Update a page
router.put('/:id', async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const existing = await sqlQuery(`SELECT * FROM page WHERE id = '${req.params.id}'`);
    if (existing.length === 0) return res.status(404).json({ error: 'Page not found' });

    await callReducer('update_page', [
      req.params.id, title || String(existing[0][1] ?? ''), content || String(existing[0][3] ?? ''), req.apiUser.id,
    ]);
    const rows = await sqlQuery(`SELECT * FROM page WHERE id = '${req.params.id}'`);
    res.json({ data: mapPage(rows[0]) });
  } catch (err) { next(err); }
});

// DELETE /api/v1/pages/:id — Soft-delete (trash) a page
router.delete('/:id', async (req, res, next) => {
  try {
    const permanent = req.query.permanent === 'true';
    if (permanent) {
      await callReducer('delete_page_permanent', [req.params.id]);
    } else {
      await callReducer('set_page_status', [req.params.id, 'deleted']);
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/pages/:id/restore — Restore a trashed page
router.post('/:id/restore', async (req, res, next) => {
  try {
    await callReducer('restore_page', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/pages/:id/duplicate — Duplicate a page
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const newId = genId('page');
    await callReducer('duplicate_page', [newId, req.params.id, req.apiUser.id]);
    const rows = await sqlQuery(`SELECT * FROM page WHERE id = '${newId}'`);
    res.status(201).json({ data: rows.length ? mapPage(rows[0]) : { id: newId } });
  } catch (err) { next(err); }
});

// POST /api/v1/pages/:id/move — Move a page to a different collection
router.post('/:id/move', async (req, res, next) => {
  try {
    const { collection_id, parent_page_id } = req.body;
    if (!collection_id) return res.status(400).json({ error: 'collection_id is required' });
    await callReducer('move_page', [
      req.params.id, collection_id, parent_page_id || '',
    ]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/pages/:id/status — Set page status
router.post('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['draft', 'published', 'archived', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: draft, published, archived, deleted' });
    }
    await callReducer('set_page_status', [req.params.id, status]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
