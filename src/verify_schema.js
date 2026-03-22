import pool from './config/db.js';

async function verify() {
    try {
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'accounts'
        `);
        console.log("Columns in 'accounts':", result.rows.map(r => r.column_name).join(', '));
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
}

verify();
