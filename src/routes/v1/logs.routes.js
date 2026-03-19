import { Router } from 'express';
import { getWebhookLogs, getErrorLogs, testWebhook } from '../../controllers/logs.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/logs/webhooks:
 *   get:
 *     tags: [Webhook Monitoring]
 *     summary: Xem lịch sử Webhook
 *     description: Lịch sử bắn event (thành công / lỗi) tới server của user.
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách log webhook.
 *
 * /api/v1/logs/errors:
 *   get:
 *     tags: [Webhook Monitoring]
 *     summary: Xem lịch sử lỗi
 *     description: "Hệ thống log lưu lại lỗi (VD: Cấm IP, Die token)"
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách lỗi
 *
 * /api/v1/logs/webhooks/test:
 *   post:
 *     tags: [Webhook Monitoring]
 *     summary: Gửi một Mock event kiểm tra
 *     description: Giả lập gửi payload test_ping tới webhook đã cấu hình.
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lệnh test đã được đẩy.
 */
router.get('/webhooks', getWebhookLogs);
router.get('/errors', getErrorLogs);
router.post('/webhooks/test', testWebhook);

export default router;
