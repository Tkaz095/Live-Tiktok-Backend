import pool from '../config/db.js';
import CloudLog from '../models/CloudLog.js';
import fs from 'fs';
import path from 'path';

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

        // Fetch from MongoDB
        const filter = { session_id: parseInt(sessionId) };
        if (type) filter.type = type;

        const logs = await CloudLog.find(filter)
            .sort({ created_at: 1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        const count = await CloudLog.countDocuments(filter);

        res.json({ success: true, count, data: logs });
    } catch (error) {
        console.error('Lỗi getSessionLogs (MongoDB):', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// GET /api/v1/live-logs/session/:sessionId/stats
export const getSessionStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const sessionCheck = await pool.query(
            `SELECT ls.id, a.data_storage_path, t.tiktok_handle FROM live_sessions ls
             JOIN tiktokers t ON t.id = ls.tiktoker_id
             JOIN accounts a ON a.id = t.account_id
             WHERE ls.id = $1 AND t.account_id = $2`,
            [sessionId, req.user.id]
        );

        if (sessionCheck.rowCount === 0) {
            return res.status(403).json({ error: 'Không có quyền truy cập session này' });
        }
        
        const { data_storage_path, tiktok_handle } = sessionCheck.rows[0];

        // 1. Lấy Summary bằng MongoDB Aggregation
        const summaryResult = await CloudLog.aggregate([
            { $match: { session_id: parseInt(sessionId) } },
            {
                $group: {
                    _id: null,
                    total_coins: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "gift"] },
                                {
                                    $multiply: [
                                        { $ifNull: ["$json_raw.diamondCount", { $ifNull: ["$json_raw.gift.diamond_count", 0] }] },
                                        { $ifNull: ["$json_raw.repeatCount", { $ifNull: ["$json_raw.count", { $ifNull: ["$quantity", 1] }] }] }
                                    ]
                                },
                                0
                            ]
                        }
                    },
                    total_likes: { $sum: { $cond: [{ $eq: ["$type", "like"] }, "$quantity", 0] } },
                    total_chats: { $sum: { $cond: [{ $eq: ["$type", "chat"] }, 1, 0] } },
                    total_members: { $sum: { $cond: [{ $eq: ["$type", "member"] }, 1, 0] } }
                }
            }
        ]);

        const summary = summaryResult.length > 0 ? {
            total_coins: summaryResult[0].total_coins,
            total_likes: summaryResult[0].total_likes,
            total_chats: summaryResult[0].total_chats,
            total_members: summaryResult[0].total_members
        } : { total_coins: 0, total_likes: 0, total_chats: 0, total_members: 0 };
        
        // 2. Lấy Top Gifters bằng MongoDB Aggregation
        const topGiftersResult = await CloudLog.aggregate([
            { $match: { session_id: parseInt(sessionId), type: 'gift' } },
            {
                $group: {
                    _id: "$sender_name",
                    gift_count: { $sum: "$quantity" },
                    total_coins: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ["$json_raw.diamondCount", { $ifNull: ["$json_raw.gift.diamond_count", 0] }] },
                                { $ifNull: ["$json_raw.repeatCount", { $ifNull: ["$json_raw.count", { $ifNull: ["$quantity", 1] }] }] }
                            ]
                        }
                    }
                }
            },
            { $sort: { total_coins: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    sender_name: "$_id",
                    gift_count: 1,
                    total_coins: 1
                }
            }
        ]);

        let localSummary = null;
        let localTopGifters = [];

        // Nếu MongoDB rỗng (ví dụ: plan Free), tiến hành parse từ file local
        if ((!summaryResult.length || summaryResult[0].total_chats === 0) && data_storage_path && fs.existsSync(data_storage_path)) {
            try {
                const folders = fs.readdirSync(data_storage_path);
                const sessionFolder = folders.find(f => f.startsWith(tiktok_handle) && f.endsWith(`_ID${sessionId}`));
                
                if (sessionFolder) {
                    const sessionDir = path.join(data_storage_path, sessionFolder);
                    let total_chats = 0, total_members = 0, total_likes = 0, total_coins = 0;
                    const gifterMap = {};

                    // Tính Chats
                    const commentsPath = path.join(sessionDir, 'comments.json');
                    if (fs.existsSync(commentsPath)) {
                        total_chats = fs.readFileSync(commentsPath, 'utf8').split('\n').filter(l => l.trim()).length;
                    }

                    // Tính Members
                    const membersPath = path.join(sessionDir, 'session_info.json');
                    if (fs.existsSync(membersPath)) {
                        total_members = fs.readFileSync(membersPath, 'utf8').split('\n').filter(l => l.trim()).length;
                    }

                    // Tính Likes
                    const likesPath = path.join(sessionDir, 'likes.json');
                    if (fs.existsSync(likesPath)) {
                        const lines = fs.readFileSync(likesPath, 'utf8').split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            try { total_likes += (JSON.parse(line).quantity || 1); } catch(e){}
                        }
                    }

                    // Tính Gifts & Top Gifters
                    const giftsPath = path.join(sessionDir, 'gifts.json');
                    if (fs.existsSync(giftsPath)) {
                        const lines = fs.readFileSync(giftsPath, 'utf8').split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            try {
                                const parsed = JSON.parse(line);
                                const q = parsed.quantity || 1;
                                const c = parsed.coins || 0;
                                const total = q * c;
                                total_coins += total;
                                
                                const user = parsed.user || 'Unknown';
                                if (!gifterMap[user]) gifterMap[user] = { sender_name: user, gift_count: 0, total_coins: 0 };
                                gifterMap[user].gift_count += q;
                                gifterMap[user].total_coins += total;
                            } catch(e){}
                        }
                    }

                    localTopGifters = Object.values(gifterMap)
                        .sort((a, b) => b.total_coins - a.total_coins)
                        .slice(0, 10);

                    localSummary = { total_coins, total_likes, total_chats, total_members };
                }
            } catch (err) {
                console.error("[Local Parse Error] Error parsing local files:", err);
            }
        }

        const finalSummary = (summaryResult.length > 0 && summaryResult[0].total_chats > 0) ? {
            total_coins: summaryResult[0].total_coins,
            total_likes: summaryResult[0].total_likes,
            total_chats: summaryResult[0].total_chats,
            total_members: summaryResult[0].total_members
        } : (localSummary || { total_coins: 0, total_likes: 0, total_chats: 0, total_members: 0 });

        const finalTopGifters = (topGiftersResult.length > 0) ? topGiftersResult : localTopGifters;

        res.json({ 
            success: true, 
            data: {
                summary: finalSummary,
                top_gifters: finalTopGifters
            } 
        });
    } catch (error) {
        console.error('Lỗi getSessionStats (MongoDB):', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
