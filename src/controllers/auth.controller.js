import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_tiktok_key';

// POST /api/v1/auth/register
export const register = async (req, res) => {
    try {
        const { username, email, password, full_name, role_id } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Cần cung cấp username, email và password' });
        }

        // Check if account exists
        const userCheck = await pool.query('SELECT id FROM accounts WHERE email = $1 OR username = $2', [email, username]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Email hoặc Username đã tồn tại' });
        }

        // Lấy role_id mặc định (User) nếu không được gửi từ client
        let finalRoleId = role_id;
        if (!finalRoleId) {
            const roleRes = await pool.query("SELECT id FROM roles WHERE role_name = 'User' LIMIT 1");
            finalRoleId = roleRes.rows[0]?.id;
        }

        if (!finalRoleId) {
            return res.status(500).json({ error: 'Không tìm thấy cấu hình phân quyền (roles) trong DB' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO accounts (username, email, password_hash, full_name, role_id, data_storage_path) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, email, full_name, role_id, data_storage_path`,
            [username, email, passwordHash, full_name || null, finalRoleId, 'C:\\Tiktok Monitor']
        );

        return res.status(201).json({ 
            success: true, 
            message: 'Đăng ký thành công', 
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi register:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// POST /api/v1/auth/login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Cần username/email và password' });
        }

        const result = await pool.query('SELECT * FROM accounts WHERE username = $1 OR email = $1 LIMIT 1', [username]);
        const account = result.rows[0];

        if (!account) {
            return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        }

        // Kiểm tra trạng thái tài khoản
        if (account.status !== 'active') {
            return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
        }

        const isMatch = await bcrypt.compare(password, account.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        }

        // Tích hợp cho Web Frontend
        const token = jwt.sign(
            { id: account.id, username: account.username, role_id: account.role_id }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: account.id,
                username: account.username,
                email: account.email,
                full_name: account.full_name,
                role_id: account.role_id,
                status: account.status,
                data_storage_path: account.data_storage_path
            }
        });
    } catch (error) {
        console.error('Lỗi login:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// PATCH /api/v1/auth/update-password
export const updatePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user?.id; // Từ middleware auth

        if (!old_password || !new_password) {
            return res.status(400).json({ error: 'Cần cung cấp mật khẩu cũ và mật khẩu mới' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        // Lấy account hiện tại
        const result = await pool.query('SELECT id, password_hash FROM accounts WHERE id = $1', [userId]);
        const account = result.rows[0];

        if (!account) {
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(old_password, account.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Mật khẩu cũ không đúng' });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(new_password, salt);

        await pool.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [newHash, userId]);

        return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi updatePassword:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// PATCH /api/v1/auth/force-update-password/:id
export const forceUpdatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({ error: 'Cần cung cấp mật khẩu mới' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        // Kiểm tra account tồn tại
        const existing = await pool.query('SELECT id FROM accounts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(new_password, salt);

        await pool.query('UPDATE accounts SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, id]);

        return res.json({ success: true, message: 'Ép đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi forceUpdatePassword:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// PATCH /api/v1/auth/update-user/:id
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, role_id, status, data_storage_path } = req.body;

        // Kiểm tra account tồn tại
        const existing = await pool.query('SELECT id FROM accounts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }

        // Kiểm tra email trùng (nếu đổi email)
        if (email) {
            const emailCheck = await pool.query('SELECT id FROM accounts WHERE email = $1 AND id != $2', [email, id]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Email đã được sử dụng bởi tài khoản khác' });
            }
        }

        // Validate role_id nếu có
        if (role_id) {
            const roleCheck = await pool.query('SELECT id FROM roles WHERE id = $1', [role_id]);
            if (roleCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Role không hợp lệ' });
            }
        }

        // Validate status nếu có
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Status phải là active hoặc inactive' });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let idx = 1;

        if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
        if (email) { updates.push(`email = $${idx++}`); values.push(email); }
        if (role_id) { updates.push(`role_id = $${idx++}`); values.push(role_id); }
        if (status) { updates.push(`status = $${idx++}`); values.push(status); }
        if (data_storage_path !== undefined) { 
            // Đảm bảo thư mục tồn tại nếu được cung cấp
            if (data_storage_path) {
                try {
                    await fs.mkdir(data_storage_path, { recursive: true });
                    console.log(`[Auth] Đã đảm bảo thư mục tồn tại: ${data_storage_path}`);
                } catch (err) {
                    console.error(`[Auth] Không thể tạo thư mục storage ${data_storage_path}:`, err);
                    // Không chặn lưu nếu lỗi nhẹ, nhưng nếu là lỗi nghiêm trọng thì có thể báo lỗi
                }
            }
            updates.push(`data_storage_path = $${idx++}`); 
            values.push(data_storage_path); 
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE accounts SET ${updates.join(', ')} WHERE id = $${idx} 
             RETURNING id, username, email, full_name, role_id, status, data_storage_path`,
            values
        );

        return res.json({
            success: true,
            message: 'Cập nhật tài khoản thành công',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi updateUser:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
