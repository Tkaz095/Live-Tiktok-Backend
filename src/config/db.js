import pg from 'pg';
import mongoose from 'mongoose';
import 'dotenv/config';

const { Pool } = pg;

// --- Cấu hình PostgreSQL ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
    console.error('❌ Lỗi kết nối PostgreSQL (Pool):', err.message);
});

// --- Cấu hình MongoDB ---
const mongoUri = process.env.MONGO_URI;

// --- Hàm kết nối cơ sở dữ liệu ---
export const connectDatabases = async () => {
    console.log('🔄 Đang khởi tạo kết nối cơ sở dữ liệu...');

    // Kết nối PostgreSQL
    const connectPostgres = async () => {
        try {
            const client = await pool.connect();
            console.log('✅ [PostgreSQL] Kết nối thành công!');
            
            // Tự động tạo bảng live_logs nếu chưa có
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS live_logs (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER REFERENCES live_sessions(id),
                    type VARCHAR(50),
                    sender_name VARCHAR(255),
                    content TEXT,
                    quantity INTEGER,
                    json_raw JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            await client.query(createTableSql);
            console.log('✅ [PostgreSQL] Đã đảm bảo bảng live_logs tồn tại.');
            
            client.release();
        } catch (error) {
            console.error('❌ [PostgreSQL] Kết nối thất bại:', error.message);
            // Có thể throw error nếu đây là DB bắt buộc
        }
    };

    // Kết nối MongoDB
    const connectMongo = async () => {
        try {
            if (!mongoUri) {
                throw new Error('MONGO_URI missing in .env');
            }
            await mongoose.connect(mongoUri);
            console.log('✅ [MongoDB] Kết nối thành công!');
        } catch (error) {
            console.error('❌ [MongoDB] Kết nối thất bại:', error.message);
        }
    };

    // Khởi động đồng thời cả 2 kết nối
    await Promise.all([connectPostgres(), connectMongo()]);
    
    console.log('🏁 Hoàn tất quá trình khởi tạo database.');
};

export { pool };
export default pool;
