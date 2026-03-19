import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { dbConnect } from './src/config/db.js';
import { setupSockets } from './src/sockets/tiktokSocket.js';

// Cấu hình kết nối Database
dbConnect();

// Tạo HTTP Server từ Express App
const httpServer = createServer(app);

// Khởi tạo Socket.io
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// Gắn logic xử lý TikTok Socket
setupSockets(io);

// Lắng nghe cổng 4000
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 TikTok Monitor Backend is running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
    console.log(`-----------------------------------------`);
});