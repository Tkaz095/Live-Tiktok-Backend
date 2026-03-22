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
            'UPDATE accounts SET webhook_url = $1 WHERE id = $2 RETURNING id, username, webhook_url',
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
            email: req.user.email,
            full_name: req.user.full_name,
            webhook_url: req.user.webhook_url,
            status: req.user.status,
            data_storage_path: req.user.data_storage_path
        }
    });
};

// API Key đã được thay thế bằng JWT hoặc hệ thống xác thực khác
export const refreshKey = async (req, res) => {
    return res.status(501).json({ error: 'Tính năng API Key không còn được hỗ trợ.' });
};
