import pool from '../config/db.js';

/**
 * Lưu một log tương tác vào database
 */
export const createLiveLog = async ({ session_id, type, sender_name, content, quantity, json_raw }) => {
    try {
        const query = `
            INSERT INTO live_logs (session_id, type, sender_name, content, quantity, json_raw)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [session_id, type, sender_name, content, quantity, json_raw];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Lỗi createLiveLog:', error);
        throw error;
    }
};

/**
 * Lưu hàng loạt log (batch insert) để tối ưu hiệu suất
 */
export const createBatchLiveLogs = async (logs) => {
    if (!logs || logs.length === 0) return;
    
    try {
        const valueStrings = [];
        const values = [];
        let index = 1;

        logs.forEach(log => {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5})`);
            values.push(log.session_id, log.type, log.sender_name, log.content, log.quantity, log.json_raw);
            index += 6;
        });

        const query = `
            INSERT INTO live_logs (session_id, type, sender_name, content, quantity, json_raw)
            VALUES ${valueStrings.join(', ')}
        `;
        await pool.query(query, values);
    } catch (error) {
        console.error('Lỗi createBatchLiveLogs:', error);
    }
};
