import pool from './config/db.js';

const createTableQuery = `
CREATE TABLE IF NOT EXISTS live_logs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES live_sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'chat', 'gift', 'like', 'member'
    sender_name VARCHAR(255),
    content TEXT,
    quantity INTEGER DEFAULT 1,
    json_raw JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function run() {
    try {
        await pool.query(createTableQuery);
        console.log("✅ Table 'live_logs' created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating table:", err);
        process.exit(1);
    }
}

run();
