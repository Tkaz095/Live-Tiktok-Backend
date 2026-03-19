import { Router } from 'express';
import {
    getMySubscription,
    getAllSubscriptions,
    createSubscription,
    updateSubscription
} from '../../controllers/subscriptions.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/subscriptions/me:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Lấy gói đang dùng của tài khoản hiện tại
 *     description: Yêu cầu Bearer Token. Trả về subscription đang active mới nhất của tài khoản đang đăng nhập, kèm thông tin gói dịch vụ.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin subscription hiện tại
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 account_id: 5
 *                 service_id: 2
 *                 start_date: "2026-03-01T00:00:00Z"
 *                 end_date: "2026-04-01T00:00:00Z"
 *                 status: "active"
 *                 service_name: "Gói Plus"
 *                 max_live_slots: 10
 *                 price_monthly: 99000
 *                 description: "Theo dõi tối đa 10 phiên Live"
 *
 * /api/v1/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: "[Admin] Lấy toàn bộ danh sách subscriptions"
 *     description: Yêu cầu Bearer Token (Admin). Trả về tất cả subscriptions kèm thông tin tài khoản và gói dịch vụ.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách subscriptions
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   account_id: 5
 *                   service_id: 2
 *                   username: "customer01"
 *                   email: "user@example.com"
 *                   full_name: "Nguyễn Văn A"
 *                   start_date: "2026-03-01T00:00:00Z"
 *                   end_date: "2026-04-01T00:00:00Z"
 *                   status: "active"
 *                   service_name: "Gói Plus"
 *                   max_live_slots: 10
 *                   price_monthly: 99000
 *
 *   post:
 *     tags: [Subscriptions]
 *     summary: Đăng ký / chọn gói dịch vụ
 *     description: >
 *       Yêu cầu Bearer Token. Người dùng chọn gói dịch vụ.
 *       Subscription cũ sẽ tự động bị hủy (status = inactive).
 *       Nếu không truyền end_date, mặc định 30 ngày từ hôm nay.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *             properties:
 *               service_id:
 *                 type: integer
 *                 example: 2
 *                 description: ID của gói dịch vụ muốn đăng ký
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-03-19T00:00:00Z"
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-04-19T00:00:00Z"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Đăng ký gói \"Gói Plus\" thành công"
 *               data:
 *                 id: 3
 *                 account_id: 5
 *                 service_id: 2
 *                 start_date: "2026-03-19T00:00:00Z"
 *                 end_date: "2026-04-19T00:00:00Z"
 *                 status: "active"
 *       404:
 *         description: Gói dịch vụ không tồn tại hoặc đã bị vô hiệu hóa
 *         content:
 *           application/json:
 *             example:
 *               error: "Gói dịch vụ không tồn tại hoặc đã bị vô hiệu hóa"
 *
 * /api/v1/subscriptions/{id}:
 *   patch:
 *     tags: [Subscriptions]
 *     summary: "[Admin] Cập nhật trạng thái subscription"
 *     description: Yêu cầu Bearer Token (Admin). Cập nhật status hoặc end_date của một subscription.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, expired]
 *                 example: "expired"
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-01T00:00:00Z"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Cập nhật subscription thành công"
 *               data:
 *                 id: 1
 *                 account_id: 5
 *                 service_id: 2
 *                 start_date: "2026-03-01T00:00:00Z"
 *                 end_date: "2026-05-01T00:00:00Z"
 *                 status: "expired"
 *                 updated_at: "2026-03-19T10:00:00Z"
 *       404:
 *         description: Không tìm thấy subscription
 *         content:
 *           application/json:
 *             example:
 *               error: "Không tìm thấy subscription"
 */

// GET /me phải đứng TRƯỚC GET /:id để không bị conflict
router.get('/me', requireAuth, getMySubscription);
router.get('/', requireAuth, getAllSubscriptions);
router.post('/', requireAuth, createSubscription);
router.patch('/:id', requireAuth, updateSubscription);

export default router;
