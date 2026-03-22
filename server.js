import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { connectDatabases } from './src/config/db.js';
import { setupSockets } from './src/sockets/tiktokSocket.js';

// Cấu hình kết nối Database
async function startServer() {
    try {
        await connectDatabases();

        // Tạo HTTP Server từ Express App
        const httpServer = createServer(app);

        // Khởi tạo Socket.io
        const io = new Server(httpServer, {
            cors: { origin: "*" }
        });

        // Gắn logic xử lý TikTok Socket
        setupSockets(io);

        // Lắng nghe cổng 4001
        const PORT = process.env.PORT || 4001;
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`-----------------------------------------`);
            console.log(`🚀 TikTok Monitor Backend is running!`);
            console.log(`📡 URL: http://localhost:${PORT}`);
            console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
            console.log(`-----------------------------------------`);
        });

        httpServer.on('error', (err) => {
            console.error('❌ Server error:', err);
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

startServer();