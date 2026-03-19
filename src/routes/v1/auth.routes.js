import { Router } from 'express';
import { login, register, updatePassword, updateUser } from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth & User]
 *     summary: Đăng ký tài khoản
 *     description: Admin tạo tài khoản cho người dùng. Yêu cầu username, email và password. Role mặc định là customer (role_id=2).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: customer01
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               role_id:
 *                 type: integer
 *                 example: 2
 *                 description: "1 = admin, 2 = customer"
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Đăng ký thành công"
 *               user:
 *                 id: 1
 *                 username: "customer01"
 *                 email: "user@example.com"
 *                 full_name: "Nguyễn Văn A"
 *                 role_id: 2
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *         content:
 *           application/json:
 *             example:
 *               error: "Cần cung cấp username, email và password"
 *       409:
 *         description: Tài khoản đã tồn tại
 *         content:
 *           application/json:
 *             example:
 *               error: "Email hoặc Username đã tồn tại"
 *
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth & User]
 *     summary: Đăng nhập
 *     description: Đăng nhập bằng username hoặc email. Trả về JWT Token (hết hạn sau 7 ngày) và thông tin người dùng. Tài khoản có status=inactive sẽ bị từ chối.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: "Có thể dùng username hoặc email"
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Đăng nhập thành công"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 username: "admin"
 *                 email: "admin@tiktok.com"
 *                 full_name: "Admin User"
 *                 role_id: 1
 *                 status: "active"
 *       401:
 *         description: Sai tài khoản hoặc mật khẩu
 *         content:
 *           application/json:
 *             example:
 *               error: "Sai tài khoản hoặc mật khẩu"
 *       403:
 *         description: Tài khoản bị vô hiệu hóa
 *         content:
 *           application/json:
 *             example:
 *               error: "Tài khoản đã bị vô hiệu hóa"
 *
 * /api/v1/auth/update-password:
 *   patch:
 *     tags: [Auth & User]
 *     summary: Đổi mật khẩu
 *     description: Yêu cầu Bearer Token. Xác thực mật khẩu cũ trước khi đổi sang mật khẩu mới (tối thiểu 6 ký tự).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *                 example: "123456"
 *               new_password:
 *                 type: string
 *                 example: "newpass123"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Đổi mật khẩu thành công"
 *       401:
 *         description: Mật khẩu cũ không đúng
 *         content:
 *           application/json:
 *             example:
 *               error: "Mật khẩu cũ không đúng"
 *
 * /api/v1/auth/update-user/{id}:
 *   patch:
 *     tags: [Auth & User]
 *     summary: Cập nhật thông tin tài khoản
 *     description: Yêu cầu Bearer Token. Cập nhật full_name, email, role_id và/hoặc status cho tài khoản theo ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID tài khoản cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Trần Văn B"
 *               email:
 *                 type: string
 *                 example: "newemail@example.com"
 *               role_id:
 *                 type: integer
 *                 example: 2
 *                 description: "1 = admin, 2 = customer"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Cập nhật tài khoản thành công"
 *               user:
 *                 id: 2
 *                 username: "customer01"
 *                 email: "newemail@example.com"
 *                 full_name: "Trần Văn B"
 *                 role_id: 2
 *                 status: "active"
 *       404:
 *         description: Không tìm thấy tài khoản
 *         content:
 *           application/json:
 *             example:
 *               error: "Không tìm thấy tài khoản"
 *       409:
 *         description: Email trùng
 *         content:
 *           application/json:
 *             example:
 *               error: "Email đã được sử dụng bởi tài khoản khác"
 */
router.post('/register', register);
router.post('/login', login);
router.patch('/update-password', requireAuth, updatePassword);
router.patch('/update-user/:id', requireAuth, updateUser);

export default router;
