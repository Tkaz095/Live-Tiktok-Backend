import pool from '../config/db.js';
import crypto from 'crypto';

// PATCH /api/v1/user/webhook
export const updateWebhook = async (req, res) => {
    try {
        const userId = req.user.id;
        const { webhook_url } = req.body;

        if (!webhook_url) {
            return res.status(400).json({ error: 'Thiếu webhook_url' });
        }

        const result = await pool.query(
            'UPDATE users SET webhook_url = $1 WHERE id = $2 RETURNING id, username, webhook_url',
            [webhook_url, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Không thể cập nhật cấu hình cho user này' });
        }

        return res.json({ 
            success: true, 
            message: 'Cập nhật Webhook URL thành công', 
            user: result.rows[0] 
        });

    } catch (error) {
        console.error('Lỗi updateWebhook:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/user/profile
export const getProfile = async (req, res) => {
    // req.user đã được populate bằng middleware
    return res.json({ 
        success: true, 
        user: {
            id: req.user.id,
            username: req.user.username,
            webhook_url: req.user.webhook_url,
            package_type: req.user.package_type
        }
    });
};

// POST /api/v1/user/refresh-key
export const refreshKey = async (req, res) => {
    try {
        const userId = req.user.id;
        const newKey = crypto.randomUUID();

        await pool.query('UPDATE users SET api_key = $1 WHERE id = $2', [newKey, userId]);

        return res.json({ 
            success: true, 
            message: 'Đã tạo API Key mới thành công', 
            api_key: newKey 
        });
    } catch (error) {
        console.error('Lỗi refreshKey:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
