import pool from '../config/db.js';

// GET /api/v1/streams/active
export const getActiveStreams = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            "SELECT * FROM live_streams WHERE status = 'online' AND user_id = $1",
            [userId]
        );
        
        return res.json({ success: true, streams: result.rows });
    } catch (error) {
        console.error('Lỗi getActiveStreams:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/streams/:id/status
export const getStreamStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, tiktok_username, status, viewer_count, started_at FROM live_streams WHERE id = $1 AND user_id = $2 LIMIT 1",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy livestream này hoặc bạn không có quyền' });
        }

        return res.json({ success: true, stream: result.rows[0] });
    } catch (error) {
        console.error('Lỗi getStreamStatus:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// POST /api/v1/streams/connect
export const connectStream = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tiktok_username } = req.body;
        if (!tiktok_username) {
            return res.status(400).json({ error: 'Thiếu tham số tiktok_username' });
        }

        // Giả lập logic: Thêm hoặc Cập nhật stream này thành 'online'
        const result = await pool.query(
            `INSERT INTO live_streams (tiktok_username, status, viewer_count, started_at, user_id) 
             VALUES ($1, 'online', 0, NOW(), $2) 
             RETURNING id, tiktok_username, status, started_at, user_id`,
            [tiktok_username, userId]
        );

        return res.status(201).json({ 
            success: true, 
            message: `Kết nối tới ${tiktok_username} thành công`, 
            stream: result.rows[0] 
        });
    } catch (error) {
        console.error('Lỗi connectStream:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// DELETE /api/v1/streams/:id
export const disconnectStream = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE live_streams SET status = 'offline' WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Không tìm thấy ID phòng livestream này hoặc bạn không có quyền' });
        }

        return res.json({ 
            success: true, 
            message: 'Đã ngắt kết nối', 
            stream: result.rows[0] 
        });
    } catch (error) {
        console.error('Lỗi disconnectStream:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
