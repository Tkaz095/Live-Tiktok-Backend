import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_tiktok_key';

// POST /api/v1/auth/register
export const register = async (req, res) => {
    try {
        const { email, password, role_id } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Cần cung cấp email và password' });
        }

        // Check if user exists check
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Email đã tồn tại' });
        }

        // Fetch Role Name mapped to ID
        const targetRoleId = role_id || 2; 
        const roleCheck = await pool.query('SELECT role_name FROM roles WHERE id = $1', [targetRoleId]);
        const isRoleValid = roleCheck.rows.length > 0;
        const roleName = isRoleValid ? roleCheck.rows[0].role_name.toLowerCase() : 'user';
        const finalRoleId = isRoleValid ? targetRoleId : 2; // fallback

        // Count existing users to generate sequential Username
        const countCheck = await pool.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [finalRoleId]);
        const nextSequence = parseInt(countCheck.rows[0].count, 10) + 1;
        const generatedUsername = `${roleName}${String(nextSequence).padStart(4, '0')}`;

        // Hash password and generate auto api_key
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const apiKey = crypto.randomUUID(); // Auto generate UUID for API Key

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, api_key, package_type, role_id) 
             VALUES ($1, $2, $3, $4, 'Basic', $5) 
             RETURNING id, username, email, api_key, package_type, role_id`,
            [generatedUsername, email, passwordHash, apiKey, finalRoleId]
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

        const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        }

        // Tích hợp cho Web Frontend
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token, // Bearer JWT token cho browser truy cập
            api_key: user.api_key, // Cho server truy cập
            user: {
                id: user.id,
                username: user.username,
                package_type: user.package_type
            }
        });
    } catch (error) {
        console.error('Lỗi login:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
