import { Router } from 'express';
import { getTiktokers, createTiktoker, updateTiktoker, deleteTiktoker } from '../../controllers/tiktokers.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/tiktokers:
 *   get:
 *     tags: [Tiktoker Management]
 *     summary: Lấy danh sách TikTokers đang theo dõi
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags: [Tiktoker Management]
 *     summary: Theo dõi thêm TikToker mới
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tiktok_handle]
 *             properties:
 *               tiktok_handle: { type: string }
 *               nickname: { type: string }
 *               avatar_url: { type: string }
 *     responses:
 *       201:
 *         description: Created
 * 
 * /api/v1/tiktokers/{id}:
 *   patch:
 *     tags: [Tiktoker Management]
 *     summary: Cập nhật thông tin TikToker (nickname, isActive)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname: { type: string }
 *               is_active: { type: boolean }
 *               avatar_url: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     tags: [Tiktoker Management]
 *     summary: Bỏ theo dõi TikToker
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 */

router.get('/', requireAuth, getTiktokers);
router.post('/', requireAuth, createTiktoker);
router.patch('/:id', requireAuth, updateTiktoker);
router.delete('/:id', requireAuth, deleteTiktoker);

export default router;
