import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import authRoutes from './v1/auth.routes.js';
import servicesRoutes from './v1/services.routes.js';
import subscriptionsRoutes from './v1/subscriptions.routes.js';
import tiktokersRoutes from './v1/tiktokers.routes.js';
import streamsRoutes from './v1/streams.routes.js';
// import usersRoutes from './v1/users.routes.js';
// import dataRoutes from './v1/data.routes.js';
// import catalogRoutes from './v1/catalog.routes.js';
// import logsRoutes from './v1/logs.routes.js';
// import adminRoutes from './v1/admin.routes.js';

const router = Router();

// Endpoint công khai (không cần xác thực)
/**
 * @swagger
 * /api/status:
 *   get:
 *     tags: [System]
 *     summary: Kiểm tra trạng thái server
 *     description: Trả về thông tin trạng thái hoạt động của Backend
 *     responses:
 *       200:
 *         description: Trạng thái ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
router.get('/status', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

router.use('/v1/auth', authRoutes);
router.use('/v1/services', servicesRoutes);
router.use('/v1/subscriptions', subscriptionsRoutes);
router.use('/v1/tiktokers', requireAuth, tiktokersRoutes);

// Endpoint yêu cầu xác thực (API Key hoặc Bearer Token)
router.use('/v1/streams', requireAuth, streamsRoutes);
// router.use('/v1/user', requireAuth, usersRoutes);
// router.use('/v1/data', requireAuth, dataRoutes);
// router.use('/v1/catalog', requireAuth, catalogRoutes);
// router.use('/v1/logs', requireAuth, logsRoutes);
// router.use('/v1/admin', requireAuth, adminRoutes);

export default router;
