import pool from './config/db.js';

async function testUpdate() {
    try {
        const id = 1; // Try with a sample ID
        const path = 'D:\\Tiktok Monitor';
        const result = await pool.query(
            `UPDATE accounts SET data_storage_path = $1 WHERE id = $2 RETURNING data_storage_path`,
            [path, id]
        );
        console.log("✅ Update successful. New path:", result.rows[0]?.data_storage_path);
        process.exit(0);
    } catch (err) {
        console.error("❌ Update failed:", err.message);
        process.exit(1);
    }
}

testUpdate();
