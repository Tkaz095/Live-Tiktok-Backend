import pool from '../config/db.js';

// GET /api/v1/services — Lấy danh sách tất cả services
export const getAllServices = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, max_live_slots, price_monthly, description, status 
             FROM services 
             ORDER BY price_monthly ASC`
        );
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi getAllServices:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// POST /api/v1/services — Tạo service mới
export const createService = async (req, res) => {
    try {
        const { name, max_live_slots, price_monthly, description, status } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Tên gói dịch vụ là bắt buộc' });
        }
        if (max_live_slots === undefined || max_live_slots < 0) {
            return res.status(400).json({ error: 'max_live_slots phải là số nguyên >= 0' });
        }

        const finalStatus = status || 'active';
        if (!['active', 'inactive'].includes(finalStatus)) {
            return res.status(400).json({ error: 'Status phải là active hoặc inactive' });
        }

        const result = await pool.query(
            `INSERT INTO services (name, max_live_slots, price_monthly, description, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, max_live_slots, price_monthly, description, status`,
            [name, max_live_slots, price_monthly ?? 0, description ?? null, finalStatus]
        );

        return res.status(201).json({
            success: true,
            message: 'Tạo gói dịch vụ thành công',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi createService:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// PATCH /api/v1/services/:id — Cập nhật service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, max_live_slots, price_monthly, description, status } = req.body;

        // Kiểm tra tồn tại
        const existing = await pool.query('SELECT id FROM services WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy gói dịch vụ' });
        }

        // Validate status nếu có
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Status phải là active hoặc inactive' });
        }

        // Dynamic update
        const updates = [];
        const values = [];
        let idx = 1;

        if (name !== undefined)           { updates.push(`name = $${idx++}`);            values.push(name); }
        if (max_live_slots !== undefined)  { updates.push(`max_live_slots = $${idx++}`);  values.push(max_live_slots); }
        if (price_monthly !== undefined)   { updates.push(`price_monthly = $${idx++}`);   values.push(price_monthly); }
        if (description !== undefined)     { updates.push(`description = $${idx++}`);     values.push(description); }
        if (status !== undefined)          { updates.push(`status = $${idx++}`);          values.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE services SET ${updates.join(', ')} WHERE id = $${idx}
             RETURNING id, name, max_live_slots, price_monthly, description, status`,
            values
        );

        return res.json({
            success: true,
            message: 'Cập nhật gói dịch vụ thành công',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi updateService:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
