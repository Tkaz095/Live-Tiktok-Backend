
import fs from 'fs';
import path from 'path';

/**
 * Đảm bảo thư mục tồn tại
 */
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Ghi log vào file JSON (NDJSON format)
 * Phân loại:
 * - chat -> comments.json
 * - gift -> gifts.json (Bóc tách: Tên User, Tên Quà, Số lượng, Số xu)
 * Các loại khác (like, member, follow...) sẽ bị bỏ qua.
 */
export const saveLogToFile = async (basePath, sessionId, type, data) => {
    if (!basePath) return;

    // Chỉ lưu Chat và Gift theo yêu cầu mới
    if (type !== 'chat' && type !== 'gift') return;

    try {
        const sessionDir = path.join(basePath, `session_${sessionId}`);
        ensureDir(sessionDir);

        let fileName;
        let logEntry;

        const timestamp = new Date().toISOString();

        if (type === 'chat') {
            fileName = 'comments.json';
            logEntry = {
                timestamp,
                user: data.sender_name,
                comment: data.content
            };
        } else if (type === 'gift') {
            fileName = 'gifts.json';
            // Dữ liệu quà tặng bắt buộc bóc tách: Tên User, Tên Quà, Số lượng, Số xu
            logEntry = {
                timestamp,
                user: data.sender_name,
                gift: data.content,
                quantity: data.quantity || 1,
                coins: data.raw?.diamondCount || 0
            };
        }

        const filePath = path.join(sessionDir, fileName);

        // Ghi thêm vào file. Mỗi dòng là một JSON object + xuống dòng (NDJSON).
        fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (error) {
        console.error(`[FileLogger Error] Session ${sessionId}:`, error.message);
    }
};
