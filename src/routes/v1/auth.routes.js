import { Router } from 'express';
import { login, register, updatePassword, updateUser, forceUpdatePassword } from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth & User]
 *     summary: Đăng ký tài khoản
 *     description: Admin tạo tài khoản cho người dùng. Yêu cầu username, email và password. Role mặc định là User.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
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
 *                 type: string
 *                 enum: ["a819114e-b843-4784-8bd6-f44b8f154267", "3289ed85-9955-4da1-9601-4ced032bb14a"]
 *                 example: "3289ed85-9955-4da1-9601-4ced032bb14a"
 *                 description: "Lựa chọn UUID:\n- Admin: a819114e-b843-4784-8bd6-f44b8f154267\n- User: 3289ed85-9955-4da1-9601-4ced032bb14a"
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
 *                 id: "bc8bf6f6-8001-4fcc-b746-d47aec3ebe3d"
 *                 username: "customer01"
 *                 email: "user@example.com"
 *                 full_name: "Nguyễn Văn A"
 *                 role_id: "20ed1ad0-3a5a-42a0-a991-be6c584238d8"
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
 *                 id: "bc8bf6f6-8001-4fcc-b746-d47aec3ebe3d"
 *                 username: "admin"
 *                 email: "admin@tiktok.com"
 *                 full_name: "Admin User"
 *                 role_id: "d1765c10-3508-4857-bdc4-f9844d7a9916"
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
 * /api/v1/auth/force-update-password/{id}:
 *   patch:
 *     tags: [Auth & User]
 *     summary: Ép đổi mật khẩu (Admin)
 *     description: Yêu cầu Bearer Token. Đổi mật khẩu của một tài khoản bất kỳ thông qua ID mà không cần mật khẩu cũ (tối thiểu 6 ký tự).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID tài khoản cần đổi mật khẩu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_password
 *             properties:
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
 *               message: "Ép đổi mật khẩu thành công"
 *       404:
 *         description: Không tìm thấy tài khoản
 *         content:
 *           application/json:
 *             example:
 *               error: "Không tìm thấy tài khoản"
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
 *           type: string
 *         description: UUID tài khoản cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
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
 *                 type: string
 *                 enum: ["a819114e-b843-4784-8bd6-f44b8f154267", "3289ed85-9955-4da1-9601-4ced032bb14a"]
 *                 example: "3289ed85-9955-4da1-9601-4ced032bb14a"
 *                 description: "Lựa chọn UUID:\n- Admin: a819114e-b843-4784-8bd6-f44b8f154267\n- User: 3289ed85-9955-4da1-9601-4ced032bb14a"
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
 *                 id: "7c181f17-6cd6-4942-97de-a8e7b803b227"
 *                 username: "customer01"
 *                 email: "newemail@example.com"
 *                 full_name: "Trần Văn B"
 *                 role_id: "20ed1ad0-3a5a-42a0-a991-be6c584238d8"
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
router.patch('/force-update-password/:id', requireAuth, forceUpdatePassword);
router.patch('/update-user/:id', requireAuth, updateUser);

export default router;
