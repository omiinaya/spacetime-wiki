import { Router } from 'express';
import { sqlQuery, callReducer, genId, mapUser } from '../stdb.js';

const router = Router();

// GET /api/v1/users/me — Current user info (from API key)
router.get('/me', async (req, res, next) => {
  try {
    // req.apiUser is already populated by auth middleware
    res.json({ data: req.apiUser });
  } catch (err) { next(err); }
});

// GET /api/v1/users — List all users
router.get('/', async (req, res, next) => {
  try {
    const rows = await sqlQuery('SELECT * FROM "user"');
    // Strip password_hash from response
    const users = rows.map(row => ({
      id: String(row[0] ?? ''),
      name: String(row[1] ?? ''),
      email: String(row[2] ?? ''),
      role: String(row[4] ?? ''),
      avatar_url: String(row[5] ?? ''),
      created_at: Number(row[6] ?? 0),
      updated_at: Number(row[7] ?? 0),
    }));
    res.json({ data: users });
  } catch (err) { next(err); }
});

// GET /api/v1/users/:id — Get a single user
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await sqlQuery(`SELECT * FROM "user" WHERE id = '${req.params.id}'`);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const row = rows[0];
    res.json({
      data: {
        id: String(row[0] ?? ''),
        name: String(row[1] ?? ''),
        email: String(row[2] ?? ''),
        role: String(row[4] ?? ''),
        avatar_url: String(row[5] ?? ''),
        created_at: Number(row[6] ?? 0),
        updated_at: Number(row[7] ?? 0),
      },
    });
  } catch (err) { next(err); }
});

// POST /api/v1/users — Register a new user
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    const id = genId('user');
    await callReducer('register_user', [id, name, email, password, role || 'member']);
    const rows = await sqlQuery(`SELECT * FROM "user" WHERE id = '${id}'`);
    res.status(201).json({
      data: rows.length ? {
        id: String(rows[0][0] ?? ''),
        name: String(rows[0][1] ?? ''),
        email: String(rows[0][2] ?? ''),
        role: String(rows[0][4] ?? ''),
        avatar_url: String(rows[0][5] ?? ''),
        created_at: Number(rows[0][6] ?? 0),
      } : { id },
    });
  } catch (err) { next(err); }
});

export default router;
