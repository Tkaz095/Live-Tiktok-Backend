
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
    
    // Xử lý đường dẫn cho môi trường Linux/Render nếu cần
    let finalPath = basePath;
    if (process.platform !== 'win32' && basePath.includes(':')) {
        // Nếu đang chạy trên Linux (Render) nhưng path lại là Windows (D:\...)
        // Tránh lỗi ENOENT bằng cách chuyển về thư mục tương đối hoặc thư mục tạm trên Linux
        finalPath = path.join(process.cwd(), 'data', 'logs');
        console.warn(`[FileLogger] Path Windows không hợp lệ trên ${process.platform}. Chuyển hướng tới: ${finalPath}`);
    }

    // Chỉ lưu Chat, Gift và Member Join theo yêu cầu mới
    if (type !== 'chat' && type !== 'gift' && type !== 'member') return;

    try {
        const sessionDir = path.join(finalPath, `session_${sessionId}`);
        console.log(`[FileLogger] Attempting to save to: ${sessionDir}`);
        ensureDir(sessionDir);

        let fileName;
        let logEntry;

        const timestamp = new Date().toISOString();

        if (type === 'chat') {
            fileName = 'comments.json';
            logEntry = {
                timestamp,
                user: data.sender_name || data.nickname,
                comment: data.content
            };
        } else if (type === 'gift') {
            fileName = 'gifts.json';
            // Dữ liệu quà tặng bắt buộc bóc tách: Tên User, Tên Quà, Số lượng, Số xu
            logEntry = {
                timestamp,
                user: data.sender_name || data.nickname,
                gift: data.content,
                quantity: data.quantity || 1,
                coins: data.json_raw?.diamondCount || data.raw?.diamondCount || 0
            };
        } else if (type === 'member') {
            fileName = 'session_info.json';
            logEntry = {
                timestamp,
                user: data.sender_name || data.nickname,
                status: 'joined',
                details: data.content
            };
        }

        const filePath = path.join(sessionDir, fileName);

        // Ghi thêm vào file. Mỗi dòng là một JSON object + xuống dòng (NDJSON).
        fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (error) {
        console.error(`[FileLogger Error] Session ${sessionId}:`, error.message);
    }
};
