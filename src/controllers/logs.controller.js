import pool from '../config/db.js';
import { sendWebhook } from '../services/webhook.service.js';
import WebhookLog from '../models/WebhookLog.js';
import ErrorLog from '../models/ErrorLog.js';

// GET /api/v1/logs/webhooks
export const getWebhookLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;

        const logs = await WebhookLog.find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(parseInt(limit, 10));

        return res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        console.error('Lỗi getWebhookLogs (MongoDB):', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/logs/errors
export const getErrorLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;

        const logs = await ErrorLog.find({ user_id: userId })
            .sort({ occurred_at: -1 })
            .limit(parseInt(limit, 10));

        return res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        console.error('Lỗi getErrorLogs (MongoDB):', error);
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
