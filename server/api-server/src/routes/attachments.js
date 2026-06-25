import { Router } from 'express';
import { sqlQuery, callReducer, genId, mapAttachment } from '../stdb.js';

const router = Router();

// GET /api/v1/attachments?page_id=... — List attachments for a page
router.get('/', async (req, res, next) => {
  try {
    const { page_id } = req.query;
    let sql = 'SELECT * FROM attachment';
    const conditions = [];
    if (page_id) conditions.push(`page_id = '${page_id}'`);
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const rows = await sqlQuery(sql);
    res.json({ data: rows.map(mapAttachment) });
  } catch (err) { next(err); }
});

// POST /api/v1/attachments — Upload an attachment (base64-encoded content)
router.post('/', async (req, res, next) => {
  try {
    const { page_id, filename, mime_type, content_base64 } = req.body;
    if (!page_id || !filename || !content_base64) {
      return res.status(400).json({
        error: 'page_id, filename, and content_base64 are required',
      });
    }

    // Validate size (max ~10MB)
    const sizeBytes = Math.ceil((content_base64.length * 3) / 4);
    if (sizeBytes > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum 10MB' });
    }

    const id = genId('att');
    await callReducer('add_attachment', [
      id, page_id, filename, mime_type || 'application/octet-stream',
      sizeBytes, content_base64, req.apiUser.id,
    ]);
    const rows = await sqlQuery(`SELECT * FROM attachment WHERE id = '${id}'`);
    res.status(201).json({ data: rows.length ? mapAttachment(rows[0]) : { id } });
  } catch (err) { next(err); }
});

// GET /api/v1/attachments/:id — Get a single attachment (with base64 content)
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await sqlQuery(`SELECT * FROM attachment WHERE id = '${req.params.id}'`);
    if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    const att = mapAttachment(rows[0]);
    res.json({ data: att });
  } catch (err) { next(err); }
});

// DELETE /api/v1/attachments/:id — Delete an attachment
router.delete('/:id', async (req, res, next) => {
  try {
    await callReducer('delete_attachment', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
