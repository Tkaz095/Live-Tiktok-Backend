import { Router } from 'express';
import { getActiveStreams, connectStream, disconnectStream, getStreamStatus } from '../../controllers/streams.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/streams/active:
 *   get:
 *     tags: [Stream Management]
 *     summary: Danh sách stream active
 *     description: Lấy danh sách các luồng đang online của User
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách stream
 *
 * /api/v1/streams/connect:
 *   post:
 *     tags: [Stream Management]
 *     summary: Kết nối luồng TikTok
 *     description: Mock logic kết nối với tên người dùng TikTok, chuyển status thành online.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tiktok_username:
 *                 type: string
 *                 example: pubg_battlegrounds_vn
 *     responses:
 *       201:
 *         description: Kết nối thành công
 *
 * /api/v1/streams/{id}/status:
 *   get:
 *     tags: [Stream Management]
 *     summary: Kiểm tra trạng thái
 *     description: Lấy trạng thái của phòng Live
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về trạng thái
 *
 * /api/v1/streams/{id}:
 *   delete:
 *     tags: [Stream Management]
 *     summary: Ngắt kết nối luồng
 *     description: Đổi status của phòng thành offline
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ngắt thành công
 */
router.get('/active', getActiveStreams);
router.post('/connect', connectStream);
router.get('/:id/status', getStreamStatus);
router.delete('/:id', disconnectStream);

export default router;
