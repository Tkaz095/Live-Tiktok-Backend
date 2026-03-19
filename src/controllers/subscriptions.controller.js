import pool from '../config/db.js';

// ─── GET /api/v1/subscriptions/me ────────────────────────────────────────────
// Lấy subscription đang active của tài khoản đang đăng nhập
export const getMySubscription = async (req, res) => {
    try {
        const accountId = req.user.id;

        const result = await pool.query(
            `SELECT s.id, s.account_id, s.service_id, s.start_date, s.end_date, s.status, s.updated_at,
                    sv.name AS service_name, sv.max_live_slots, sv.price_monthly, sv.description
             FROM subscriptions s
             JOIN services sv ON sv.id = s.service_id
             WHERE s.account_id = $1
             ORDER BY s.start_date DESC
             LIMIT 1`,
            [accountId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, data: null, message: 'Chưa đăng ký gói nào' });
        }

        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Lỗi getMySubscription:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ─── GET /api/v1/subscriptions ────────────────────────────────────────────────
// [Admin] Lấy toàn bộ subscriptions (kèm thông tin account và service)
export const getAllSubscriptions = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.id, s.account_id, s.service_id, s.start_date, s.end_date, s.status, s.updated_at,
                    a.username, a.email, a.full_name,
                    sv.name AS service_name, sv.max_live_slots, sv.price_monthly
             FROM subscriptions s
             JOIN accounts a  ON a.id  = s.account_id
             JOIN services sv ON sv.id = s.service_id
             ORDER BY s.start_date DESC`
        );
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi getAllSubscriptions:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ─── POST /api/v1/subscriptions ───────────────────────────────────────────────
// Người dùng đăng ký / chọn gói dịch vụ
export const createSubscription = async (req, res) => {
    try {
        const accountId = req.user.id;
        const { service_id, start_date, end_date } = req.body;

        if (!service_id) {
            return res.status(400).json({ error: 'service_id là bắt buộc' });
        }

        // Kiểm tra service tồn tại và đang active
        const serviceCheck = await pool.query(
            `SELECT id, name FROM services WHERE id = $1 AND status = 'active'`,
            [service_id]
        );
        if (serviceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Gói dịch vụ không tồn tại hoặc đã bị vô hiệu hóa' });
        }

        // Vô hiệu hoá subscription cũ (nếu có)
        await pool.query(
            `UPDATE subscriptions SET status = 'inactive' WHERE account_id = $1 AND status = 'active'`,
            [accountId]
        );

        const finalStartDate = start_date || new Date().toISOString();
        // end_date: nếu không truyền, mặc định 30 ngày
        const finalEndDate = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const result = await pool.query(
            `INSERT INTO subscriptions (account_id, service_id, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING id, account_id, service_id, start_date, end_date, status`,
            [accountId, service_id, finalStartDate, finalEndDate]
        );

        return res.status(201).json({
            success: true,
            message: `Đăng ký gói "${serviceCheck.rows[0].name}" thành công`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi createSubscription:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ─── PATCH /api/v1/subscriptions/:id ─────────────────────────────────────────
// [Admin] Cập nhật subscription: status, end_date
export const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, end_date } = req.body;

        // Kiểm tra tồn tại
        const existing = await pool.query('SELECT id FROM subscriptions WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy subscription' });
        }

        if (status && !['active', 'inactive', 'expired'].includes(status)) {
            return res.status(400).json({ error: 'Status phải là: active, inactive, hoặc expired' });
        }

        const updates = [];
        const values = [];
        let idx = 1;

        if (status !== undefined)   { updates.push(`status = $${idx++}`);   values.push(status); }
        if (end_date !== undefined) { updates.push(`end_date = $${idx++}`); values.push(end_date); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = $${idx}
             RETURNING id, account_id, service_id, start_date, end_date, status, updated_at`,
            values
        );

        return res.json({
            success: true,
            message: 'Cập nhật subscription thành công',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi updateSubscription:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
