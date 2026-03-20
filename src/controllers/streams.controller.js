import pool from '../config/db.js';

// Lấy giới hạn số luồng của người dùng dựa trên subscription
const getUserStreamLimit = async (accountId) => {
  // Tìm subscription active mới nhất
  const result = await pool.query(
    `SELECT s.id, sv.max_live_slots 
     FROM subscriptions s
     JOIN services sv ON sv.id = s.service_id
     WHERE s.account_id = $1 AND s.status = 'active'
     ORDER BY s.start_date DESC LIMIT 1`,
    [accountId]
  );

  if (result.rows.length > 0) {
    return result.rows[0].max_live_slots;
  }

  // Mặc định cho người chưa mua gói (VD: Gói Free mặc định 3 slot)
  // Hoặc bạn có thể query service có price_monthly = 0
  return 3; 
};

// GET /api/v1/streams/active
export const getActiveStreams = async (req, res) => {
  try {
    const accountId = req.user.id;
    const result = await pool.query(
      `SELECT ls.*, t.tiktok_handle, t.nickname, t.avatar_url 
       FROM live_sessions ls
       JOIN tiktokers t ON t.id = ls.tiktoker_id
       WHERE t.account_id = $1 AND ls.status = 'online'`,
      [accountId]
    );
    res.json({ success: true, streams: result.rows });
  } catch (error) {
    console.error('Lỗi getActiveStreams:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// POST /api/v1/streams/connect
export const connectStream = async (req, res) => {
  try {
    const accountId = req.user.id;
    const { tiktok_url, tiktoker_id } = req.body;

    if (!tiktok_url || !tiktoker_id) {
      return res.status(400).json({ error: 'Thiếu tiktok_url hoặc tiktoker_id' });
    }

    // 1. Kiểm tra giới hạn số luồng
    const limit = await getUserStreamLimit(accountId);
    
    // Đếm số luồng đang online của user này
    const countResult = await pool.query(
      `SELECT COUNT(*) 
       FROM live_sessions ls
       JOIN tiktokers t ON t.id = ls.tiktoker_id
       WHERE t.account_id = $1 AND ls.status = 'online'`,
      [accountId]
    );
    const activeCount = parseInt(countResult.rows[0].count);

    if (activeCount >= limit) {
      return res.status(403).json({ 
        error: `Số luồng livestream vượt quá giới hạn gói của bạn (${limit} luồng).` 
      });
    }

    // 2. Kiểm tra xem có phiên nào đang 'online' cho Tiktoker này không
    // Hoặc có phiên nào mới 'offline' gần đây (trong vòng 1 tiếng) thì "resume" lại
    const existingSession = await pool.query(
      `SELECT * FROM live_sessions 
       WHERE tiktoker_id = $1 
       AND (status = 'online' OR (status = 'offline' AND end_at > NOW() - INTERVAL '1 hour'))
       ORDER BY start_at DESC LIMIT 1`,
      [tiktoker_id]
    );

    let sessionData;

    if (existingSession.rows.length > 0) {
      const session = existingSession.rows[0];
      if (session.status === 'offline') {
        // Resume phiên cũ
        const updateResult = await pool.query(
          `UPDATE live_sessions SET status = 'online', end_at = NULL WHERE id = $1 RETURNING *`,
          [session.id]
        );
        sessionData = updateResult.rows[0];
        console.log(`[Session Resume] Resumed session ${session.id} for tiktoker ${tiktoker_id}`);
      } else {
        // Tái sử dụng phiên đang online
        sessionData = session;
        console.log(`[Session Reuse] Reusing active session ${session.id} for tiktoker ${tiktoker_id}`);
      }
    } else {
      // Tạo session mới
      const result = await pool.query(
        `INSERT INTO live_sessions (tiktoker_id, tiktok_url, status, start_at)
         VALUES ($1, $2, 'online', NOW())
         RETURNING *`,
        [tiktoker_id, tiktok_url]
      );
      sessionData = result.rows[0];
      console.log(`[Session New] Created new session ${sessionData.id} for tiktoker ${tiktoker_id}`);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Kết nối luồng thành công',
      data: sessionData
    });
  } catch (error) {
    console.error('Lỗi connectStream:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// GET /api/v1/streams/:id/status
export const getStreamStatus = async (req, res) => {
  try {
    const accountId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ls.* 
       FROM live_sessions ls
       JOIN tiktokers t ON t.id = ls.tiktoker_id
       WHERE ls.id = $1 AND t.account_id = $2`,
      [id, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy session hoặc bạn không có quyền' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Lỗi getStreamStatus:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// DELETE /api/v1/streams/:id
export const disconnectStream = async (req, res) => {
  try {
    const accountId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE live_sessions ls
       SET status = 'offline', end_at = NOW()
       FROM tiktokers t
       WHERE ls.id = $1 AND t.id = ls.tiktoker_id AND t.account_id = $2
       RETURNING ls.*`,
      [id, accountId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy session hoặc bạn không có quyền' });
    }

    res.json({ success: true, message: 'Đã ngắt kết nối luồng', data: result.rows[0] });
  } catch (error) {
    console.error('Lỗi disconnectStream:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};
