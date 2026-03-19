import express from 'express';
import { getSessionLogs, getSessionStats } from '../../controllers/liveLogs.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Live Logs
 *   description: API quản lý nhật ký tương tác TikTok Live
 */

/**
 * @swagger
 * /api/v1/live-logs/session/{sessionId}:
 *   get:
 *     tags: [Live Logs]
 *     summary: Lấy nhật ký tương tác của một phiên Live
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của phiên Live (live_sessions.id)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [chat, gift, like, member]
 *         description: Loại tương tác muốn lọc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Trả về danh sách logs
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/session/:sessionId', requireAuth, getSessionLogs);

/**
 * @swagger
 * /api/v1/live-logs/session/{sessionId}/stats:
 *   get:
 *     tags: [Live Logs]
 *     summary: Lấy thống kê tổng hợp của một phiên Live
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trả về object thống kê (coins, likes, chats, members)
 */
router.get('/session/:sessionId/stats', requireAuth, getSessionStats);

export default router;
