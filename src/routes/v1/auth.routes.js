import { Router } from 'express';
import { login, register } from '../../controllers/auth.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth & User]
 *     summary: Đăng ký tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 2
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth & User]
 *     summary: Đăng nhập
 *     description: Lấy JWT Token và API Key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login thành công
 */
router.post('/register', register);
router.post('/login', login);

export default router;
