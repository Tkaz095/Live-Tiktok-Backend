import pool from '../config/db.js';

// GET /api/v1/live-logs/session/:sessionId
export const getSessionLogs = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { type, limit = 100, offset = 0 } = req.query;
        
        // Verify permission: session belongs to a tiktoker owned by the user
        const sessionCheck = await pool.query(
            `SELECT ls.id FROM live_sessions ls
             JOIN tiktokers t ON t.id = ls.tiktoker_id
             WHERE ls.id = $1 AND t.account_id = $2`,
            [sessionId, req.user.id]
        );

        if (sessionCheck.rowCount === 0) {
            return res.status(403).json({ error: 'Không có quyền truy cập session này' });
        }

        let query = `SELECT * FROM live_logs WHERE session_id = $1`;
        const params = [sessionId];

        if (type) {
            query += ` AND type = $2`;
            params.push(type);
        }

        query += ` ORDER BY created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getSessionLogs:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/live-logs/session/:sessionId/stats
export const getSessionStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const sessionCheck = await pool.query(
            `SELECT ls.id FROM live_sessions ls
             JOIN tiktokers t ON t.id = ls.tiktoker_id
             WHERE ls.id = $1 AND t.account_id = $2`,
            [sessionId, req.user.id]
        );

        if (sessionCheck.rowCount === 0) {
            return res.status(403).json({ error: 'Không có quyền truy cập session này' });
        }

        // 1. Lấy Summary bằng SQL để đảm bảo tốc độ và chính xác
        const summaryResult = await pool.query(`
            SELECT 
                COALESCE(SUM(
                    CASE WHEN type = 'gift' THEN 
                        COALESCE((json_raw->>'diamondCount')::int, (json_raw->'gift'->>'diamond_count')::int, 0) * 
                        COALESCE((json_raw->>'repeatCount')::int, (json_raw->>'count')::int, quantity, 1)
                    ELSE 0 END
                ), 0) as total_coins,
                COALESCE(SUM(CASE WHEN type = 'like' THEN quantity ELSE 0 END), 0) as total_likes,
                COUNT(CASE WHEN type = 'chat' THEN 1 END) as total_chats,
                COUNT(CASE WHEN type = 'member' THEN 1 END) as total_members
            FROM live_logs 
            WHERE session_id = $1
        `, [sessionId]);

        const summary = {
            total_coins: parseInt(summaryResult.rows[0].total_coins || 0),
            total_likes: parseInt(summaryResult.rows[0].total_likes || 0),
            total_chats: parseInt(summaryResult.rows[0].total_chats || 0),
            total_members: parseInt(summaryResult.rows[0].total_members || 0)
        };
        
        // 2. Lấy Top Gifters cho phiên này (Sắp xếp theo Xu thay vì số lượng)
        const topGiftersResult = await pool.query(`
            SELECT 
                sender_name, 
                SUM(quantity) as gift_count,
                SUM(
                    COALESCE((json_raw->>'diamondCount')::int, (json_raw->'gift'->>'diamond_count')::int, 0) * 
                    COALESCE((json_raw->>'repeatCount')::int, (json_raw->>'count')::int, quantity, 1)
                ) as total_coins 
            FROM live_logs 
            WHERE session_id = $1 AND type = 'gift'
            GROUP BY sender_name
            ORDER BY total_coins DESC
            LIMIT 10
        `, [sessionId]);

        const topGifters = topGiftersResult.rows.map(r => ({
            sender_name: r.sender_name,
            gift_count: parseInt(r.gift_count || 0),
            total_coins: parseInt(r.total_coins || 0)
        }));

        res.json({ 
            success: true, 
            data: {
                summary,
                top_gifters: topGifters
            } 
        });
    } catch (error) {
        console.error('Lỗi getSessionStats:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
