import pool from '../config/db.js';

// GET /api/v1/tiktokers
export const getTiktokers = async (req, res) => {
  try {
    const accountId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM tiktokers WHERE account_id = $1 ORDER BY created_at DESC',
      [accountId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Lỗi getTiktokers:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// POST /api/v1/tiktokers
export const createTiktoker = async (req, res) => {
  try {
    const accountId = req.user.id;
    const { tiktok_handle, nickname, avatar_url } = req.body;

    if (!tiktok_handle) {
      return res.status(400).json({ error: 'Thiếu tiktok_handle' });
    }

    const result = await pool.query(
      `INSERT INTO tiktokers (account_id, tiktok_handle, nickname, avatar_url, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [accountId, tiktok_handle, nickname || tiktok_handle, avatar_url || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Lỗi createTiktoker:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// PATCH /api/v1/tiktokers/:id
export const updateTiktoker = async (req, res) => {
  try {
    const accountId = req.user.id;
    const { id } = req.params;
    const { nickname, is_active, avatar_url } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (nickname !== undefined) { updates.push(`nickname = $${idx++}`); values.push(nickname); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
    }

    values.push(id, accountId);
    const result = await pool.query(
      `UPDATE tiktokers SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${idx} AND account_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tiktoker hoặc bạn không có quyền' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Lỗi updateTiktoker:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// DELETE /api/v1/tiktokers/:id
export const deleteTiktoker = async (req, res) => {
  try {
    const accountId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tiktokers WHERE id = $1 AND account_id = $2 RETURNING *',
      [id, accountId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tiktoker hoặc bạn không có quyền' });
    }

    res.json({ success: true, message: 'Đã xóa tiktoker thành công' });
  } catch (error) {
    console.error('Lỗi deleteTiktoker:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};
