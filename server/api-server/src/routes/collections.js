import { Router } from 'express';
import { sqlQuery, callReducer, genId, mapCollection } from '../stdb.js';

const router = Router();

// GET /api/v1/collections — List all collections
router.get('/', async (req, res, next) => {
  try {
    const rows = await sqlQuery('SELECT * FROM collection ORDER BY sort_order ASC');
    res.json({ data: rows.map(mapCollection) });
  } catch (err) { next(err); }
});

// GET /api/v1/collections/:id — Get a single collection
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await sqlQuery(`SELECT * FROM collection WHERE id = '${req.params.id}'`);
    if (rows.length === 0) return res.status(404).json({ error: 'Collection not found' });
    res.json({ data: mapCollection(rows[0]) });
  } catch (err) { next(err); }
});

// POST /api/v1/collections — Create a new collection
router.post('/', async (req, res, next) => {
  try {
    const { name, description, parent_id, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const id = genId('col');
    await callReducer('create_collection', [
      id, name, description || '', parent_id || '', icon || '', color || '', req.apiUser.id,
    ]);
    const rows = await sqlQuery(`SELECT * FROM collection WHERE id = '${id}'`);
    res.status(201).json({ data: rows.length ? mapCollection(rows[0]) : { id } });
  } catch (err) { next(err); }
});

// PUT /api/v1/collections/:id — Update a collection
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;
    const existing = await sqlQuery(`SELECT * FROM collection WHERE id = '${req.params.id}'`);
    if (existing.length === 0) return res.status(404).json({ error: 'Collection not found' });

    await callReducer('update_collection', [
      req.params.id,
      name || String(existing[0][1] ?? ''),
      description || String(existing[0][3] ?? ''),
      icon ?? String(existing[0][5] ?? ''),
      color ?? String(existing[0][6] ?? ''),
    ]);
    const rows = await sqlQuery(`SELECT * FROM collection WHERE id = '${req.params.id}'`);
    res.json({ data: mapCollection(rows[0]) });
  } catch (err) { next(err); }
});

// DELETE /api/v1/collections/:id — Delete a collection
router.delete('/:id', async (req, res, next) => {
  try {
    await callReducer('delete_collection', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
