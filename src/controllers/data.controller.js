import pool from '../config/db.js';

// GET /api/v1/data/gifts?stream_id=...&limit=50&sort=desc
export const getGiftsLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { stream_id, limit = 50, sort = 'desc' } = req.query;
        
        let queryStr = `
            SELECT gl.id, gl.stream_id, gl.sender_username, gl.quantity, gl.created_at, 
                   gc.gift_name, gc.diamond_count, gc.image_url
            FROM gift_logs gl
            LEFT JOIN gift_catalog gc ON gl.gift_id = gc.gift_id
            INNER JOIN live_streams ls ON gl.stream_id = ls.id
            WHERE ls.user_id = $1
        `;
        const params = [userId];

        if (stream_id) {
            params.push(stream_id);
            queryStr += ` AND gl.stream_id = $2`;
        }

        queryStr += ` ORDER BY gl.created_at ${sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'} LIMIT $${params.length + 1}`;
        params.push(parseInt(limit, 10));

        const result = await pool.query(queryStr, params);

        return res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getGiftsLogs:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/data/comments?stream_id=...
export const getComments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { stream_id, limit = 50, sort = 'desc' } = req.query;

        let queryStr = `
            SELECT cl.id, cl.stream_id, cl.sender_username, cl.nickname, cl.content, cl.created_at
            FROM comment_logs cl
            INNER JOIN live_streams ls ON cl.stream_id = ls.id
            WHERE ls.user_id = $1
        `;
        const params = [userId];

        if (stream_id) {
            params.push(stream_id);
            queryStr += ` AND cl.stream_id = $2`;
        }

        queryStr += ` ORDER BY cl.created_at ${sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'} LIMIT $${params.length + 1}`;
        params.push(parseInt(limit, 10));

        const result = await pool.query(queryStr, params);
        
        return res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getComments:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/data/summary/:stream_id
export const getSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { stream_id } = req.params;

        // Check ownership
        const streamCheck = await pool.query("SELECT viewer_count FROM live_streams WHERE id = $1 AND user_id = $2", [stream_id, userId]);
        if (streamCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy ID phòng livestream này hoặc bạn không có quyền' });
        }

        const viewerCount = streamCheck.rows[0].viewer_count;

        // Tally gifts
        const giftStats = await pool.query(`
            SELECT 
                SUM(gl.quantity) AS total_gifts,
                SUM(gl.quantity * gc.diamond_count) AS total_coins
            FROM gift_logs gl
            LEFT JOIN gift_catalog gc ON gl.gift_id = gc.gift_id
            WHERE gl.stream_id = $1
        `, [stream_id]);

        return res.json({ 
            success: true, 
            summary: {
                stream_id,
                viewers: viewerCount,
                total_gifts: parseInt(giftStats.rows[0].total_gifts || 0, 10),
                total_coins: parseInt(giftStats.rows[0].total_coins || 0, 10)
            } 
        });
    } catch (error) {
        console.error('Lỗi getSummary:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
