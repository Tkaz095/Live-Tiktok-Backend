import { Router } from 'express';
import { updateWebhook, getProfile, refreshKey } from '../../controllers/users.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     tags: [Auth & User]
 *     summary: Lấy thông tin user
 *     description: Lấy thông tin JSON của User đang đăng nhập dựa trên token hoặc api key
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
 *         description: Thông tin profile user
 * 
 * /api/v1/user/refresh-key:
 *   post:
 *     tags: [Auth & User]
 *     summary: Làm mới API Key
 *     description: Tạo lại key mới cho user
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về api_key mới
 * 
 * /api/v1/user/webhook:
 *   patch:
 *     tags: [Auth & User]
 *     summary: Cập nhật Webhook URL
 *     description: Cập nhật biến webhook_url cho user dựa vào x-api-key cung cấp trong header.
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               webhook_url:
 *                 type: string
 *                 example: "https://webhook.site/..."
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/profile', getProfile);
router.post('/refresh-key', refreshKey);
router.patch('/webhook', updateWebhook);

export default router;
