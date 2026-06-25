import { sqlQuery } from './stdb.js';

/**
 * API Key authentication middleware.
 * Validates the Bearer token against the STDB api_key table.
 * Attaches `req.apiUser` with user info and `req.apiKey` with key info on success.
 */
export async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header. Use: Bearer <api_key>' });
  }
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization must be in format: Bearer <api_key>' });
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return res.status(401).json({ error: 'Empty API key' });
  }

  try {
    // Look up the API key by its prefix (first 8 chars for performance, then verify)
    const prefix = rawKey.slice(0, 8);
    const rows = await sqlQuery(
      `SELECT * FROM api_key WHERE key_prefix = '${prefix}' AND is_revoked = false`
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Find matching key by full hash
    // In production, use crypto.timingSafeEqual for hash comparison
    const { createHash } = await import('crypto');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const matchedKey = rows.find(r => String(r[3] ?? '') === keyHash);
    if (!matchedKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const apiKey = {
      id: String(matchedKey[0] ?? ''),
      user_id: String(matchedKey[1] ?? ''),
      name: String(matchedKey[2] ?? ''),
      last_used_at: Number(matchedKey[5] ?? 0),
      created_at: Number(matchedKey[6] ?? 0),
      expires_at: Number(matchedKey[7] ?? 0),
      is_revoked: Boolean(matchedKey[8]),
    };

    // Check expiration
    if (apiKey.expires_at > 0 && Date.now() > apiKey.expires_at) {
      return res.status(401).json({ error: 'API key has expired' });
    }

    // Update last_used_at (fire-and-forget via reducer)
    const { callReducer } = await import('./stdb.js');
    callReducer('update_api_key_usage', [apiKey.id]).catch(() => {});

    // Fetch the associated user
    const userRows = await sqlQuery(`SELECT * FROM \"user\" WHERE id = '${apiKey.user_id}'`);
    if (userRows.length === 0) {
      return res.status(401).json({ error: 'API key user not found' });
    }

    const userRow = userRows[0];
    req.apiUser = {
      id: String(userRow[0] ?? ''),
      name: String(userRow[1] ?? ''),
      email: String(userRow[2] ?? ''),
      role: String(userRow[4] ?? ''),
      avatar_url: String(userRow[5] ?? ''),
    };
    req.apiKey = apiKey;

    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
}
