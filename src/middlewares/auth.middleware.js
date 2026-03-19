import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_tiktok_key';

export const requireAuth = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired JWT token' });
        }
    } else if (apiKey) {
        try {
            const result = await pool.query('SELECT id FROM users WHERE api_key = $1 LIMIT 1', [apiKey]);
            if (result.rows.length > 0) {
                userId = result.rows[0].id;
            }
        } catch (dbErr) {
            console.error('Database error checking API key:', dbErr);
            return res.status(500).json({ error: 'Database error' });
        }
    }

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid x-api-key or Bearer Token' });
    }

    try {
        const result = await pool.query('SELECT id, username, webhook_url, package_type FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'User not found in DB' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        console.error('Lỗi xác thực Auth:', error);
        return res.status(500).json({ error: 'Lỗi server khi xác thực' });
    }
};
