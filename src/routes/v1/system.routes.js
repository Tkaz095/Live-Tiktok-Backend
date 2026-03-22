
import { Router } from 'express';
import { selectDirectory, getDrives, listDirectory } from '../../controllers/system.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/system/select-directory:
 *   get:
 *     tags: [System]
 *     summary: Mở hộp thoại chọn thư mục (Windows)
 *     description: Yêu cầu Bearer Token. Trả về đường dẫn thư mục được chọn từ File Explorer của Server.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/select-directory', requireAuth, selectDirectory);
router.get('/drives', requireAuth, getDrives);
router.get('/list-directory', requireAuth, listDirectory);

export default router;
