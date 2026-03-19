import axios from 'axios';
import pool from '../config/db.js';

/**
 * Gửi webhook sự kiện (vd: quà, like) tới cấu hình webhook_url của User
 * @param {string|number} userId - ID của user trong bảng users
 * @param {object} eventData - Dữ liệu JSON cần bắn đi
 */
export const sendWebhook = async (userId, eventData) => {
    try {
        // Lấy webhook_url của user
        const userRes = await pool.query('SELECT webhook_url FROM users WHERE id = $1 LIMIT 1', [userId]);
        const webhookUrl = userRes.rows[0]?.webhook_url;

        if (!webhookUrl) {
            console.log(`[Webhook] User ID ${userId} không có webhook_url.`);
            return;
        }

        let statusCode = null;
        let responseBody = null;

        try {
            // Thực hiện POST request
            const response = await axios.post(webhookUrl, eventData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000 // Timeout sau 5s phòng khi webhook server bị treo
            });
            
            statusCode = response.status;
            responseBody = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data?.toString();
            console.log(`[Webhook] ✅ Gửi thành công tới ${webhookUrl} (Status: ${statusCode})`);
        } catch (postError) {
            statusCode = postError.response?.status || 500;
            responseBody = postError.response?.data ? JSON.stringify(postError.response.data) : postError.message;
            console.error(`[Webhook] ❌ Lỗi gửi ${webhookUrl}:`, postError.message);
        }

        // Lưu kết quả vào bảng webhook_logs
        await pool.query(
            `INSERT INTO webhook_logs (user_id, payload, response_code, response_body) 
             VALUES ($1, $2, $3, $4)`,
            [userId, JSON.stringify(eventData), statusCode, responseBody]
        );

    } catch (dbError) {
        console.error('[Webhook] Lỗi Database trong quá trình bắn Webhook:', dbError);
    }
};
