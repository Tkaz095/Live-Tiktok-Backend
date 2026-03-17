import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    console.log(`Mới có người kết nối: ${socket.id}`);

    let tiktokConnection;

    socket.on('join', (data) => {
        const username = data.room.replace('@', ''); // Lấy username sạch
        console.log(`Đang kết nối tới TikTok Live của: ${username}`);

        // Tạo kết nối thật tới TikTok
        tiktokConnection = new WebcastPushConnection(username);

        tiktokConnection.connect().then(state => {
            console.log(`Đã vào phòng của ${username}`);
        }).catch(err => {
            console.error('Lỗi kết nối TikTok:', err);
        });

        // Hứng Comment thật và phát lại qua Socket cho Frontend
        tiktokConnection.on('chat', (data) => {
            io.to(socket.id).emit('chat', {
                user: data.nickname,
                message: data.comment,
                avatar: data.profilePictureUrl
            });
        });

        // Hứng Quà thật
        tiktokConnection.on('gift', (data) => {
            io.to(socket.id).emit('gift', {
                user: data.nickname,
                giftName: data.giftName,
                count: data.repeatCount,
                diamondCount: data.diamondCount
            });
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConnection) tiktokConnection.disconnect();
    });
});

httpServer.listen(4000, () => console.log("Backend TikTok chạy tại port 4000"));