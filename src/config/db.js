import pg from 'pg';
import mongoose from 'mongoose';
import 'dotenv/config';

const { Pool } = pg;

const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

// --- Cấu hình PostgreSQL ---
const pool = new Pool({
    // Ưu tiên dùng DATABASE_URL trên Render, nếu chạy ở máy cá nhân (Local) thì tự ghép chuỗi
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    
    // Bắt buộc bật SSL khi chạy trên môi trường Cloud (chứ không chỉ khi có DATABASE_URL)
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('❌ Lỗi kết nối PostgreSQL (Tiểu trình nền - Idle Client):', err.message);
    // Tính năng an toàn: Tránh ứng dụng Nodejs sập hoàn toàn nếu Render tự động gắt kết nối
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
            client.release();
        } catch (error) {
            console.error('❌ [PostgreSQL] Kết nối thất bại:', error.message);
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
