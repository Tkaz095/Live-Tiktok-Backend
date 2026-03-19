import pool from '../config/db.js';
import { sendWebhook } from '../services/webhook.service.js';

// GET /api/v1/logs/webhooks
export const getWebhookLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;

        const result = await pool.query(
            "SELECT * FROM webhook_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
            [userId, parseInt(limit, 10)]
        );

        return res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getWebhookLogs:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/logs/errors
export const getErrorLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;

        const result = await pool.query(
            "SELECT * FROM error_logs WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT $2",
            [userId, parseInt(limit, 10)]
        );

        return res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getErrorLogs:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// POST /api/v1/logs/webhooks/test
export const testWebhook = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const mockPayload = {
            event: "test_ping",
            timestamp: new Date().toISOString(),
            message: "Hệ thống Webhook của bạn đang hoạt động bình thường!"
        };

        // Gọi service webhook
        await sendWebhook(userId, mockPayload);

        return res.json({ 
            success: true, 
            message: 'Đã đẩy event test_ping tới Webhook. Hãy kiểm tra Logs để xem kết quả.' 
        });
    } catch (error) {
        console.error('Lỗi testWebhook:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
