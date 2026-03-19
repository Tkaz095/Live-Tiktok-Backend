import { Router } from 'express';
import { getAllServices, createService, updateService } from '../../controllers/services.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Gói Free"
 *         max_live_slots:
 *           type: integer
 *           example: 3
 *         price_monthly:
 *           type: number
 *           example: 0
 *         description:
 *           type: string
 *           example: "Theo dõi tối đa 3 phiên Live cùng lúc"
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 *
 * /api/v1/services:
 *   get:
 *     tags: [Services]
 *     summary: Lấy danh sách gói dịch vụ
 *     description: Trả về tất cả gói dịch vụ, sắp xếp theo giá tăng dần.
 *     responses:
 *       200:
 *         description: Danh sách gói dịch vụ
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   name: "Gói Free"
 *                   max_live_slots: 3
 *                   price_monthly: 0
 *                   description: "Theo dõi tối đa 3 phiên Live"
 *                   status: "active"
 *                 - id: 2
 *                   name: "Gói Plus"
 *                   max_live_slots: 10
 *                   price_monthly: 99000
 *                   description: "Theo dõi tối đa 10 phiên Live"
 *                   status: "active"
 *
 *   post:
 *     tags: [Services]
 *     summary: Tạo gói dịch vụ mới
 *     description: Yêu cầu Bearer Token (Admin). Tạo một gói dịch vụ mới với tên, số slot live và giá tháng.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - max_live_slots
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Gói Pro"
 *               max_live_slots:
 *                 type: integer
 *                 example: 20
 *               price_monthly:
 *                 type: number
 *                 example: 299000
 *               description:
 *                 type: string
 *                 example: "Theo dõi tối đa 20 phiên Live đồng thời"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: "active"
 *     responses:
 *       201:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Tạo gói dịch vụ thành công"
 *               data:
 *                 id: 3
 *                 name: "Gói Pro"
 *                 max_live_slots: 20
 *                 price_monthly: 299000
 *                 description: "Theo dõi tối đa 20 phiên Live đồng thời"
 *                 status: "active"
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *         content:
 *           application/json:
 *             example:
 *               error: "Tên gói dịch vụ là bắt buộc"
 *
 * /api/v1/services/{id}:
 *   patch:
 *     tags: [Services]
 *     summary: Cập nhật gói dịch vụ
 *     description: Yêu cầu Bearer Token (Admin). Cập nhật một hoặc nhiều trường của gói dịch vụ.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của gói dịch vụ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Gói Plus (Nâng cấp)"
 *               max_live_slots:
 *                 type: integer
 *                 example: 15
 *               price_monthly:
 *                 type: number
 *                 example: 149000
 *               description:
 *                 type: string
 *                 example: "Mô tả mới"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: "inactive"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Cập nhật gói dịch vụ thành công"
 *               data:
 *                 id: 2
 *                 name: "Gói Plus (Nâng cấp)"
 *                 max_live_slots: 15
 *                 price_monthly: 149000
 *                 description: "Mô tả mới"
 *                 status: "inactive"
 *       404:
 *         description: Không tìm thấy
 *         content:
 *           application/json:
 *             example:
 *               error: "Không tìm thấy gói dịch vụ"
 */
router.get('/', getAllServices);
router.post('/', requireAuth, createService);
router.patch('/:id', requireAuth, updateService);

export default router;
