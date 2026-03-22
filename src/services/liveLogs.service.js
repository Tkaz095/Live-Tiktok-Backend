import CloudLog from '../models/CloudLog.js';

/**
 * Lưu một log tương tác vào MongoDB (CloudLogs)
 */
export const createLiveLog = async ({ session_id, type, sender_name, content, quantity, json_raw, shouldSaveToCloud = true }) => {
    if (!shouldSaveToCloud) return null;
    try {
        const log = new CloudLog({
            session_id,
            type,
            sender_name,
            content,
            quantity,
            json_raw
        });
        return await log.save();
    } catch (error) {
        console.error('Lỗi createLiveLog (MongoDB):', error);
        throw error;
    }
};

/**
 * Lưu hàng loạt log (batch insert) vào MongoDB
 */
export const createBatchLiveLogs = async (logs, shouldSaveToCloud = true) => {
    if (!shouldSaveToCloud || !logs || logs.length === 0) return;
    
    try {
        await CloudLog.insertMany(logs, { ordered: false });
    } catch (error) {
        console.error('Lỗi createBatchLiveLogs (MongoDB):', error);
    }
};
