import pool from '../config/db.js';

// GET /api/v1/admin/users
export const getAllUsers = async (req, res) => {
    try {
        // Lấy danh sách tất cả users
        const result = await pool.query(
            "SELECT id, username, email, webhook_url, package_type, api_key, created_at FROM users ORDER BY created_at DESC"
        );
        return res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (error) {
        console.error('Lỗi getAllUsers:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// PATCH /api/v1/admin/users/:id/package
export const updateUserPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { package_type } = req.body;
        
        if (!['Basic', 'Pro', 'Vip', 'VIP'].includes(package_type)) {
            return res.status(400).json({ error: 'Package type không hợp lệ (Phải là Basic, Pro hoặc VIP)' });
        }

        const result = await pool.query(
            "UPDATE users SET package_type = $1 WHERE id = $2 RETURNING id, username, email, package_type",
            [package_type, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Không tìm thấy user với ID tương ứng' });
        }
        
        return res.json({ 
            success: true, 
            message: 'Cập nhật gói cước thành công',
            user: result.rows[0] 
        });
    } catch (error) {
        console.error('Lỗi updateUserPackage:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
