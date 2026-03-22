import pool from '../config/db.js';

// GET /api/v1/admin/users
export const getAllUsers = async (req, res) => {
    try {
        // Lấy danh sách tất cả users
        const result = await pool.query(
            "SELECT id, username, email, webhook_url, full_name, created_at FROM accounts ORDER BY created_at DESC"
        );
        return res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getAllUsers:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// Cập nhật gói cước - Đã chuyển sang dùng bảng subscriptions
export const updateUserPackage = async (req, res) => {
    return res.status(501).json({ error: 'Tính năng nâng cấp gói đã chuyển sang hệ thống Subscriptions mới.' });
};
