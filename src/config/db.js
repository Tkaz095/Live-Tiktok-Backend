import pg from 'pg';
import mongoose from 'mongoose';
import 'dotenv/config';

const { Pool } = pg;

const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

// --- Cấu hình PostgreSQL ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // [Render Fix] Cần SSL để kết nối từ bên ngoài
    ssl: isLocal ? false : { rejectUnauthorized: false }
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

            // Tự động tạo cấu trúc bảng nếu chưa có (Theo script UUID mới)
            const initSchemaSql = `
                CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

                -- 0. XÓA CÁC BẢNG CŨ (Theo script của user để đảm bảo di chuyển UUID thành công)
                DROP TABLE IF EXISTS live_sessions CASCADE;
                DROP TABLE IF EXISTS tiktokers CASCADE;
                DROP TABLE IF EXISTS subscriptions CASCADE;
                DROP TABLE IF EXISTS services CASCADE;
                DROP TABLE IF EXISTS accounts CASCADE;
                DROP TABLE IF EXISTS roles CASCADE;

                -- 1. Bảng Roles
                CREATE TABLE IF NOT EXISTS roles (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    role_name VARCHAR(50) NOT NULL UNIQUE
                );

                -- 2. Bảng Accounts
                CREATE TABLE IF NOT EXISTS accounts (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
                    full_name VARCHAR(100),
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    webhook_url VARCHAR(255),
                    data_storage_path VARCHAR(255)
                );

                -- 3. Bảng Services
                CREATE TABLE IF NOT EXISTS services (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(100) NOT NULL,
                    max_live_slots INT DEFAULT 1,
                    price_monthly INT DEFAULT 0,
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'active',
                    enable_webhook_filter BOOLEAN DEFAULT FALSE,
                    enable_cloud_storage BOOLEAN DEFAULT FALSE,
                    max_tracked_tiktokers INT DEFAULT 3
                );

                -- 4. Bảng Subscriptions
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP,
                    status VARCHAR(20) DEFAULT 'active',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- 5. Bảng Tiktokers
                CREATE TABLE IF NOT EXISTS tiktokers (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                    tiktok_handle VARCHAR(100) NOT NULL UNIQUE,
                    nickname VARCHAR(100),
                    avatar_url VARCHAR(255),
                    author_id VARCHAR(100),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- 6. Bảng Live Sessions
                CREATE TABLE IF NOT EXISTS live_sessions (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    tiktoker_id UUID REFERENCES tiktokers(id) ON DELETE CASCADE,
                    tiktok_url VARCHAR(255),
                    room_id VARCHAR(100),
                    live_title VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'connecting',
                    start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_at TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Trigger updated_at
                CREATE OR REPLACE FUNCTION update_modified_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = now();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';

                -- Gắn Trigger (Dùng DO block để tránh lỗi nếu trigger đã tồn tại)
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accounts_modtime') THEN
                        CREATE TRIGGER update_accounts_modtime BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_modtime') THEN
                        CREATE TRIGGER update_subscriptions_modtime BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tiktokers_modtime') THEN
                        CREATE TRIGGER update_tiktokers_modtime BEFORE UPDATE ON tiktokers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_live_sessions_modtime') THEN
                        CREATE TRIGGER update_live_sessions_modtime BEFORE UPDATE ON live_sessions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
                    END IF;
                END $$;

                -- Insert default roles (Dùng UUID cố định từ user)
                INSERT INTO roles (id, role_name) VALUES 
                ('d1765c10-3508-4857-bdc4-f9844d7a9916', 'Admin'), 
                ('20ed1ad0-3a5a-42a0-a991-be6c584238d8', 'Customer') 
                ON CONFLICT (id) DO NOTHING;

                -- Insert demo accounts
                INSERT INTO accounts (id, username, email, password_hash, role_id, full_name, status, data_storage_path) VALUES
                ('bc8bf6f6-8001-4fcc-b746-d47aec3ebe3d', 'admin_super', 'admin@example.com', 'hash_password_here_123', 'd1765c10-3508-4857-bdc4-f9844d7a9916', 'Quản Trị Viên Hệ Thống', 'active', 'C:\\Tiktok Monitor'),
                ('7c181f17-6cd6-4942-97de-a8e7b803b227', 'customer_01', 'user01@example.com', 'hash_password_here_456', '20ed1ad0-3a5a-42a0-a991-be6c584238d8', 'Nguyễn Văn Khách Hàng', 'active', 'C:\\Tiktok Monitor')
                ON CONFLICT (id) DO NOTHING;
            `;
            await client.query(initSchemaSql);
            console.log('✅ [PostgreSQL] Đã khởi tạo cấu trúc bảng UUID thành công.');

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
