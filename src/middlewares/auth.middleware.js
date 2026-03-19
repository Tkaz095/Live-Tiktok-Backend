import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_tiktok_key';

export const requireAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (err) {
            return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
        }
    }

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Thiếu Bearer Token' });
    }

    try {
        const result = await pool.query('SELECT id, username, email, role_id, status FROM accounts WHERE id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Không tìm thấy tài khoản' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        console.error('Lỗi xác thực Auth:', error);
        return res.status(500).json({ error: 'Lỗi server khi xác thực' });
    }
};
