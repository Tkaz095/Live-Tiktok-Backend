import { Router } from 'express';
import { getGiftCatalog } from '../../controllers/catalog.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/catalog/gifts:
 *   get:
 *     tags: [Data Logs & Summary]
 *     summary: Danh sách từ điển Quà tặng
 *     description: Lấy danh sách ánh xạ ID quà sang Hình ảnh và Tên để Frontend render
 *     responses:
 *       200:
 *         description: Trả về danh sách mẫu quà
 */
router.get('/gifts', getGiftCatalog);

export default router;
