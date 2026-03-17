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

        // Khởi tạo các biến thống kê cho phiên Live
        let totalCoins = 0;

        // Tạo kết nối thật tới TikTok
        tiktokConnection = new WebcastPushConnection(username);

        tiktokConnection.connect().then(state => {
            console.log(`Đã vào phòng của ${username}. Đang có ${state.viewerCount} người xem.`);
            // Gửi trạng thái ban đầu (số người xem, số tim)
            io.to(socket.id).emit('room_info', {
                viewerCount: state.viewerCount,
                likeCount: state.likeCount || 0
            });
        }).catch(err => {
            console.error('Lỗi kết nối TikTok:', err);
        });

        // Hứng sự kiện Viewer Join (Người xem stream) thay vì người theo dõi
        tiktokConnection.on('member', (data) => {
            io.to(socket.id).emit('viewer_join', {
                user: data.nickname,
                avatar: data.profilePictureUrl
            });
        });

        // Hứng số lượng Tim (Like)
        tiktokConnection.on('like', (data) => {
            io.to(socket.id).emit('like', {
                user: data.nickname,
                likeCount: data.likeCount,
                totalLikeCount: data.totalLikeCount // Tổng số tim hiện tại của phòng
            });
        });

        // Hứng sự kiện Cập nhật số người xem (Viewer Count)
        tiktokConnection.on('roomUser', (data) => {
            if (data.viewerCount) {
                io.to(socket.id).emit('viewer_count', {
                    viewerCount: data.viewerCount
                });
            }
        });

        // Hứng Comment thật và phát lại qua Socket cho Frontend
        tiktokConnection.on('chat', (data) => {
            io.to(socket.id).emit('chat', {
                user: data.nickname,
                message: data.comment,
                avatar: data.profilePictureUrl
            });
        });

        // Hứng Quà thật & Tính tổng xu từ quà
        tiktokConnection.on('gift', (data) => {
            // Khi combo quà kết thúc, hoặc quà được gửi một lần
            if (data.giftType === 1 && !data.repeatEnd) {
                // Combo đang tiếp diễn thì chưa cộng dồn (để tránh cộng trùng lặp)
                // Tuy nhiên mỗi lần gửi frontend có thể tự xử lý hiệu ứng.
            } else {
                // Quà combo kết thúc hoăc là 1 phần quà lớn
                // Tính xu = Số lượng * Giá trị 1 phần quà
                const coinValue = (data.diamondCount * data.repeatCount) || 0;
                totalCoins += coinValue;

                io.to(socket.id).emit('gift', {
                    user: data.nickname,
                    giftName: data.giftName,
                    count: data.repeatCount,
                    diamondCount: data.diamondCount,
                    totalCoins: totalCoins // Tổng số xu phòng có lúc này từ lúc server chạy
                });
            }
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConnection) tiktokConnection.disconnect();
    });
});

httpServer.listen(4000, () => console.log("Backend TikTok chạy tại port 4000"));