import { Router } from 'express';
import { getGiftsLogs, getComments, getSummary } from '../../controllers/data.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/data/gifts:
 *   get:
 *     tags: [Data Logs & Summary]
 *     summary: Xem lịch sử nhận quà
 *     description: Lấy ra log phần quà mới nhất. Hỗ trợ filter theo `stream_id`
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *       - in: query
 *         name: stream_id
 *         schema:
 *           type: integer
 *         description: Lọc dữ liệu theo ID luồng Live.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Số lượng cần lấy.
 *     responses:
 *       200:
 *         description: Trả về danh sách quà tặng
 *
 * /api/v1/data/comments:
 *   get:
 *     tags: [Data Logs & Summary]
 *     summary: Xem lịch sử comments
 *     description: Lấy ra log phần bình luận mới nhất. Hỗ trợ filter theo `stream_id`
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *       - in: query
 *         name: stream_id
 *         schema:
 *           type: integer
 *         description: Lọc dữ liệu theo ID luồng Live.
 *     responses:
 *       200:
 *         description: Trả về danh sách comments
 *
 * /api/v1/data/summary/{stream_id}:
 *   get:
 *     tags: [Data Logs & Summary]
 *     summary: Thông kê thu nhập Stream
 *     description: Phân tích và tính tổng số coins và danh sách số lượng qua
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *       - in: path
 *         name: stream_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thống kê thành công
 */
router.get('/gifts', getGiftsLogs);
router.get('/comments', getComments);
router.get('/summary/:stream_id', getSummary);

export default router;
