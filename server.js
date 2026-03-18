import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// Lưu trữ kết nối TikTok tập trung (Global), tránh bị trùng lặp kết nối và ban IP
const activeTiktokStreams = new Map();

io.on('connection', (socket) => {
    console.log(`Mới có người kết nối: ${socket.id}`);

    let currentRoom = null;

    socket.on('join', (data) => {
        const username = data.room.replace('@', ''); // Lấy username sạch
        
        // Tránh tình trạng Frontend (như React StrictMode) spam sự kiện join liên tục
        if (currentRoom === username) return;

        // Nếu client muốn chuyển sang live khác, thoát phòng cũ
        if (currentRoom) {
            socket.leave(currentRoom);
            checkCleanup(currentRoom); // Dọn dẹp kết nối cũ nếu không còn ai xem
        }

        currentRoom = username;
        socket.join(username); // Socket tham gia phòng mang tên username
        console.log(`Socket ${socket.id} bắt đầu theo dõi TikTok Live của: ${username}`);

        // 1. KIỂM TRA: Nếu Backend chửa kết nối tới TikTok Live này thì tạo mới
        if (!activeTiktokStreams.has(username)) {
            console.log(`[+] Đang khởi tạo kết nối TikTok Live cho: ${username}...`);
            const tiktokConnection = new WebcastPushConnection(username, {
                processInitialData: true,
                enableExtendedGiftInfo: true,
                enableWebsocketUpgrade: true,
                requestPollingIntervalMs: 2000,
                clientParams: {
                    "app_language": "vi-VN",
                    "device_platform": "web"
                }
            });
            
            // Lưu trạng thái của phiên Live vào bộ nhớ chung
            const streamData = {
                connection: tiktokConnection,
                totalCoins: 0,
                viewerCount: 0,
                likeCount: 0,
                isConnecting: true
            };
            activeTiktokStreams.set(username, streamData);

            tiktokConnection.connect().then(state => {
                streamData.isConnecting = false;
                streamData.viewerCount = state?.viewerCount || state?.roomInfo?.viewerCount || state?.roomInfo?.user_count || 0;
                streamData.likeCount = state?.likeCount || state?.roomInfo?.likeCount || state?.roomInfo?.like_count || 0;

                console.log(`Đã vào phòng của ${username}. Đang có ${streamData.viewerCount} người xem, ${streamData.likeCount} tim.`);
                
                // Gửi trạng thái ban đầu tới TOÀN BỘ những ai đang xem room này
                io.to(username).emit('room_info', {
                    viewerCount: streamData.viewerCount,
                    likeCount: streamData.likeCount
                });
            }).catch(err => {
                console.error(`Lỗi kết nối TikTok cho ${username}:`, err);
                io.to(username).emit('error', 'Không thể kết nối tới TikTok Live (Có thể Live đã tắt hoặc sai ID)');
                activeTiktokStreams.delete(username);
            });

            // ====== HỨNG CÁC SỰ KIỆN TỪ TIKTOK VÀ BẮN VÀO ROOM ====== //

            tiktokConnection.on('error', (err) => {
                console.error(`[TikTok Error] Lỗi với ${username}:`, err.message || err);
            });

            tiktokConnection.on('disconnected', () => {
                console.log(`[TikTok Disconnected] Mất kết nối tới ${username}.`);
            });

            tiktokConnection.on('streamEnd', (actionId) => {
                console.log(`[TikTok StreamEnd] Phiên live của ${username} đã kết thúc.`);
                io.to(username).emit('stream_end');
            });

            tiktokConnection.on('member', (data) => {
                io.to(username).emit('viewer_join', {
                    user: data.nickname,
                    avatar: data.profilePictureUrl
                });
            });

            tiktokConnection.on('like', (data) => {
                streamData.likeCount = data.totalLikeCount;
                io.to(username).emit('like', {
                    user: data.nickname,
                    likeCount: data.likeCount,
                    totalLikeCount: data.totalLikeCount
                });
            });

            tiktokConnection.on('roomUser', (data) => {
                const vCount = data.viewerCount || data.userCount || 0;
                if (vCount > 0) {
                    streamData.viewerCount = vCount;
                    io.to(username).emit('viewer_count', {
                        viewerCount: vCount
                    });
                }
            });

            tiktokConnection.on('chat', (data) => {
                io.to(username).emit('chat', {
                    user: data.nickname,
                    message: data.comment,
                    avatar: data.profilePictureUrl
                });
            });

            tiktokConnection.on('gift', (data) => {
                const diamondCount = data.diamondCount || (data.gift && data.gift.diamond_count) || 0;
                const repeatCount = data.repeatCount || 1;

                if (data.giftType !== 1 || data.repeatEnd) {
                    streamData.totalCoins += (diamondCount * repeatCount);
                }

                io.to(username).emit('gift', {
                    user: data.nickname,
                    giftName: data.giftName || 'Gift',
                    count: repeatCount,
                    diamondCount: diamondCount,
                    totalCoins: streamData.totalCoins
                });
            });
        } 
        // 2. NẾU ĐÃ CÓ KẾT NỐI: Tức là client khác đã mở Live này trước đó
        else {
            console.log(`[*] Tái sử dụng kết nối TikTok Live cho: ${username}.`);
            const streamData = activeTiktokStreams.get(username);
            
            // Nếu stream đã connect xong, bắn trạng thái ngay lập tức cho người mới vào phòng
            if (!streamData.isConnecting) {
                io.to(socket.id).emit('room_info', {
                    viewerCount: streamData.viewerCount,
                    likeCount: streamData.likeCount
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Đã thoát kết nối: ${socket.id}`);
        if (currentRoom) {
            checkCleanup(currentRoom);
        }
    });

    // Hàm kiểm tra xem còn Client nào xem phiên Live này không, nếu không thì kết thúc
    function checkCleanup(roomName) {
        // Delay 1 chút để tránh trường hợp người dùng vừa bấm F5 bị sập stream ngay
        setTimeout(() => {
            const roomData = io.sockets.adapter.rooms.get(roomName);
            const clientsCount = roomData ? roomData.size : 0;
            
            if (clientsCount === 0 && activeTiktokStreams.has(roomName)) {
                console.log(`[-] Không còn ai xem ${roomName}. Đang đóng kết nối TikTok stream nhằm tiết kiệm RAM...`);
                const streamData = activeTiktokStreams.get(roomName);
                if (streamData && streamData.connection) {
                    streamData.connection.disconnect();
                }
                activeTiktokStreams.delete(roomName);
            }
        }, 3000); // Đợi 3 giây trước khi thực sự ngắt (tăng thời gian đệm F5)
    }
});

httpServer.listen(4000, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 TikTok Monitor Backend is running!`);
    console.log(`📡 URL: http://localhost:${4000}`);
    console.log(`-----------------------------------------`);
});