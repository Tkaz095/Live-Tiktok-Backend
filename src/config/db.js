import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

pool.on('error', (err, client) => {
    console.error('Lỗi khi kết nối PostgreSQL:', err);
});

export const dbConnect = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Kết nối cơ sở dữ liệu TiktokDB (PostgreSQL) thành công!');
        client.release();
    } catch (error) {
        console.error('❌ Lỗi kết nối PostgreSQL:', error.message);
    }
}

export default pool;
