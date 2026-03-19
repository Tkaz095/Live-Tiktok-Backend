import { Router } from 'express';
import { getAllUsers, updateUserPackage } from '../../controllers/admin.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Xem danh sách toàn bộ User
 *     description: Dành cho Admin Dashboard để liệt kê Users và gói cước.
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
 *         description: Trả về danh sách user
 *
 * /api/v1/admin/users/{id}/package:
 *   patch:
 *     tags: [Admin]
 *     summary: Cập nhật gói cước cho User
 *     description: Change the package_type format parameter (Basic, Pro, VIP).
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               package_type:
 *                 type: string
 *                 example: VIP
 *     responses:
 *       200:
 *         description: Trả về object user đã nâng cấp
 */
router.get('/users', getAllUsers);
router.patch('/users/:id/package', updateUserPackage);

export default router;
