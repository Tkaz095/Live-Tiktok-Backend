import { WebcastPushConnection } from 'tiktok-live-connector';
import * as liveLogsService from '../services/liveLogs.service.js';
import * as fileLogger from '../services/fileLogger.service.js';
import pool from '../config/db.js';

console.log('>>> TIKTOK SOCKET LOADED V3 <<<');

export const setupSockets = (io) => {
    // Lưu trữ kết nối TikTok tập trung (Global), tránh bị trùng lặp kết nối và ban IP
    const activeTiktokStreams = new Map();

    io.on('connection', (socket) => {
        console.log(`Mới có người kết nối: ${socket.id}`);

        let currentRoom = null;

        socket.on('join', (data) => {
            const username = data.room.replace('@', ''); // Lấy username sạch
            const sessionId = data.sessionId; // Lấy sessionId từ frontend
            console.log(`[Socket Join] Username: ${username}, SessionId: ${sessionId}, SocketId: ${socket.id}`);
            socket.sessionId = sessionId; // Lưu vào socket để dùng lúc disconnect
            
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

            // 1. KIỂM TRA: Nếu Backend chưa kết nối tới TikTok Live này thì tạo mới
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
                    hostNickname: username,
                    hostFollowers: null,
                    isConnecting: true,
                    chats: [],
                    giftCache: {},
                    sessionIds: new Set(), // Bộ sưu tập sessionId đang theo dõi room này
                    chatCount: 0, // Tổng số chat (Baseline DB + Real-time)
                    sessionPaths: new Map(), // sessionId -> dataStoragePath
                    sessionPlans: new Map() // sessionId -> subscriptionPlan
                };
                if (sessionId) {
                    streamData.sessionIds.add(sessionId);
                    // Fetch storage path for this session
                    pool.query(`
                        SELECT a.data_storage_path, a.role_id 
                        FROM live_sessions ls
                        JOIN tiktokers t ON t.id = ls.tiktoker_id
                        JOIN accounts a ON a.id = t.account_id
                        WHERE ls.id = $1
                    `, [sessionId]).then(res => {
                        const path = res.rows[0]?.data_storage_path;
                        const role_id = res.rows[0]?.role_id;
                        const plan = role_id === 1 ? 'pro' : 'free';
                        console.log(`[Socket Debug] Session: ${sessionId}, Path: ${path}, Role: ${role_id}, Plan: ${plan}`);
                        if (path) {
                            streamData.sessionPaths.set(sessionId, path);
                            // Force folder creation immediately
                            fileLogger.saveLogToFile(path, sessionId, 'member', { sender_name: 'System', content: 'Session started' }, username);
                        }
                        streamData.sessionPlans.set(sessionId, plan);
                    }).catch(e => console.error('[DB Error V3] Fetch storage path error:', e.message));
                }
                activeTiktokStreams.set(username, streamData);

                // Hàm kết nối TikTok (Không load baseline từ Postgres live_logs nữa)
                const startConnection = async () => {
                    try {
                        const state = await tiktokConnection.connect();
                        streamData.isConnecting = false;

                        // Cache thông tin gifts
                        if (state?.availableGifts) {
                            state.availableGifts.forEach(gift => {
                                streamData.giftCache[gift.id] = gift;
                            });
                        }

                        const owner = state?.roomInfo?.data?.owner || {};
                        streamData.hostNickname = owner.nickname || username;
                        streamData.hostAvatar = owner.avatar_thumb?.url_list?.[0] || null;
                        streamData.hostFollowers = owner.follow_info?.follower_count || null;
                        
                        streamData.viewerCount = state?.viewerCount || state?.roomInfo?.viewerCount || state?.roomInfo?.user_count || 0;

                        const roomId = state.roomId || state.roomInfo?.data?.id_str;
                        const liveTitle = state.roomInfo?.data?.title || 'TikTok Live';

                        // [Sync Likes] Lấy số tim thực tế từ TikTok
                        const tiktokTotalLikes = state?.roomInfo?.data?.stats?.like_count || 0;
                        if (tiktokTotalLikes > streamData.likeCount) {
                            streamData.likeCount = tiktokTotalLikes;
                        }
                        
                        if (roomId && streamData.sessionIds.size > 0) {
                            const sessionIdsBatch = Array.from(streamData.sessionIds);
                            
                            // 1. Cập nhật thông tin phiên live (ID là UUID)
                            pool.query(
                                `UPDATE live_sessions 
                                 SET room_id = $1, live_title = $2 
                                 WHERE id = ANY($3::uuid[])`,
                                [roomId, liveTitle, sessionIdsBatch]
                            ).catch(dbErr => console.error('[DB Error] Update session info failed:', dbErr.message));

                            // 2. Cập nhật thông tin Tiktoker
                            pool.query(
                                `UPDATE tiktokers 
                                 SET nickname = $1, avatar_url = $2 
                                 WHERE tiktok_handle = $3`,
                                [streamData.hostNickname, streamData.hostAvatar, username]
                            ).catch(dbErr => console.error('[DB Error] Update Tiktoker info failed:', dbErr.message));
                        }

                        console.log(`Đã vào phòng ${username}. Viewers: ${streamData.viewerCount}, Likes: ${streamData.likeCount}`);
                        
                        io.to(username).emit('room_info', {
                            viewerCount: streamData.viewerCount,
                            likeCount: streamData.likeCount,
                            totalCoins: streamData.totalCoins,
                            chatCount: streamData.chatCount,
                            hostNickname: streamData.hostNickname,
                            hostAvatar: streamData.hostAvatar,
                            hostFollowers: streamData.hostFollowers
                        });

                        io.to(username).emit('chat_history', streamData.chats);

                    } catch (err) {
                        console.error(`Lỗi kết nối TikTok cho ${username}:`, err);
                        io.to(username).emit('error', 'Không thể kết nối tới TikTok Live');
                        activeTiktokStreams.delete(username);
                    }
                };

                startConnection();

                // ====== HỨNG CÁC SỰ KIỆN TỪ TIKTOK VÀ BẮN VÀO ROOM ====== //

                tiktokConnection.on('error', (err) => {
                    console.error(`[TikTok Error] Lỗi với ${username}:`, err.message || err);
                    io.to(username).emit('tiktok_error', 'Lỗi TikTok Live: ' + (err.message || 'Thử lại sau'));
                });

                tiktokConnection.on('disconnected', () => {
                    console.log(`[TikTok Disconnected] Mất kết nối tới ${username}.`);
                    io.to(username).emit('tiktok_disconnected', `Phiên kết nối của ${username} bị ngắt đột ngột từ TikTok`);
                });

                tiktokConnection.on('streamEnd', (actionId) => {
                    console.log(`[TikTok StreamEnd] Phiên live của ${username} đã kết thúc.`);
                    io.to(username).emit('stream_end');
                });

                tiktokConnection.on('member', (data) => {
                    const nickname = data.nickname || data.uniqueId || 'User';
                    io.to(username).emit('viewer_join', {
                        user: nickname,
                        avatar: data.profilePictureUrl
                    });

                    // Log member join
                    streamData.sessionIds.forEach(sid => {
                        const plan = streamData.sessionPlans.get(sid) || 'free';
                        const shouldSaveToCloud = plan !== 'free';

                        liveLogsService.createLiveLog({
                            session_id: sid,
                            type: 'member',
                            sender_name: nickname,
                            content: 'vừa vào phòng',
                            json_raw: data,
                            shouldSaveToCloud
                        }).catch(e => console.error(`[Logging Error] Member for sid ${sid}:`, e.message));

                        // Log to local file if path exists
                        const storagePath = streamData.sessionPaths.get(sid);
                        if (storagePath) {
                            fileLogger.saveLogToFile(storagePath, sid, 'member', { sender_name: nickname, content: 'vừa vào phòng', raw: data }, username);
                        }
                    });
                });

                tiktokConnection.on('like', (data) => {
                    // Cập nhật số tim mới. Ưu tiên totalLikeCount của TikTok nếu nó lớn hơn
                    if (data.totalLikeCount && data.totalLikeCount > streamData.likeCount) {
                        streamData.likeCount = data.totalLikeCount;
                    } else if (data.likeCount > 0) {
                        streamData.likeCount += data.likeCount;
                    }

                    if (data.likeCount > 0 || data.totalLikeCount > 0) {
                        // Phát sự kiện tới frontend
                        io.to(username).emit('like', {
                            user: data.nickname,
                            likeCount: data.likeCount,
                            totalLikeCount: streamData.likeCount
                        });

                        // Ghi log vào DB
                        streamData.sessionIds.forEach(sid => {
                            const plan = streamData.sessionPlans.get(sid) || 'free';
                            const shouldSaveToCloud = plan !== 'free';

                            liveLogsService.createLiveLog({
                                session_id: sid,
                                type: 'like',
                                sender_name: data.nickname,
                                content: `đã thả ${data.likeCount} tim`,
                                quantity: data.likeCount,
                                json_raw: data,
                                shouldSaveToCloud
                            }).catch(e => console.error(`[Logging Error] Like for sid ${sid}:`, e.message));

                            // Log to local file if path exists
                            const storagePath = streamData.sessionPaths.get(sid);
                            if (storagePath) {
                                fileLogger.saveLogToFile(storagePath, sid, 'like', { sender_name: data.nickname, content: `đã thả ${data.likeCount} tim`, quantity: data.likeCount, raw: data });
                            }
                        });
                    }
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
                    const uniqueId = data.msgId || Math.random().toString(36).substring(7);
                    
                    // Prevent duplicate tracking if TikTok re-polls history internally
                    if (streamData.chats.some(c => c.id === uniqueId)) return;

                    const chatMsg = {
                        id: uniqueId,
                        user: data.nickname || data.user || 'unknown',
                        message: data.comment || data.message || '',
                        avatar: data.profilePictureUrl
                    };
                    
                    streamData.chats.unshift(chatMsg);
                    if (streamData.chats.length > 100) streamData.chats.pop();

                    // Log chat
                    streamData.chatCount++;
                    console.log(`[Logging Chat] Room: ${username}, SessionIds:`, Array.from(streamData.sessionIds));
                    io.to(username).emit('chat', { 
                        ...chatMsg, 
                        chatCount: streamData.chatCount 
                    });

                    streamData.sessionIds.forEach(sid => {
                        const plan = streamData.sessionPlans.get(sid) || 'free';
                        const shouldSaveToCloud = plan !== 'free';

                        liveLogsService.createLiveLog({
                            session_id: sid,
                            type: 'chat',
                            sender_name: chatMsg.user,
                            content: chatMsg.message,
                            json_raw: data,
                            shouldSaveToCloud
                        }).catch(e => console.error(`[Logging Error] Chat for sid ${sid}:`, e.message));

                        // Log to local file if path exists
                        const storagePath = streamData.sessionPaths.get(sid);
                        if (storagePath) {
                            fileLogger.saveLogToFile(storagePath, sid, 'chat', { sender_name: chatMsg.user, content: chatMsg.message, raw: data }, username);
                        }
                    });
                });

                tiktokConnection.on('gift', (data) => {
                    const cachedGift = streamData.giftCache[data.giftId] || {};

                    const diamondCount = data.diamondCount || data.gift?.diamond_count || cachedGift.diamond_count || 0;
                    const repeatCount = data.repeatCount || 1;

                    if (data.giftType !== 1 || data.repeatEnd) {
                        streamData.totalCoins += (diamondCount * repeatCount);
                    }

                    // Cung cấp chi tiết ảnh của phần quà và avatar người gửi bằng multi-layer lookup an toàn
                    const giftName = data.giftName || data.gift?.name || cachedGift.name || 'Unknown Gift';
                    let giftPictureUrl = data.giftPictureUrl 
                        || data.gift?.image?.url_list?.[0] 
                        || cachedGift.image?.url_list?.[0] 
                        || '';
                    
                    // Sửa lỗi: Nếu URL không có http/https, thêm https:// để tránh lỗi render ảnh móp méo bên frontend
                    if (giftPictureUrl && giftPictureUrl.startsWith('//')) {
                        giftPictureUrl = 'https:' + giftPictureUrl;
                    }

                    // Logging logic để dễ debug khi quà bị thiếu thông tin
                    if (!giftPictureUrl || giftName === 'Unknown Gift') {
                        console.log(`[Gift Map Warning] Thiếu thông tin quà: ID=${data.giftId}, Name=${giftName}, URL_Exists=${!!giftPictureUrl}`);
                    } else {
                        console.log(`[Gift Map Success] ${data.nickname} tặng ${repeatCount}x ${giftName} (${diamondCount} xu/cái)`);
                    }
                    
                    io.to(username).emit('gift', {
                        user: data.nickname,
                        avatar: data.profilePictureUrl,
                        giftId: data.giftId,
                        giftName: giftName,
                        gift_name: giftName, // Để khớp với frontend (data.gift_name)
                        giftPictureUrl: giftPictureUrl,
                        icon: giftPictureUrl, // Để khớp với frontend (data.icon)
                        count: repeatCount,
                        diamondCount: diamondCount,
                        diamond_value: diamondCount, // Để khớp với frontend (data.diamond_value)
                        totalCoins: streamData.totalCoins
                    });

                    // Log gift (chỉ log nếu combo kết thúc hoặc là quà lẻ)
                    if (data.giftType !== 1 || data.repeatEnd) {
                        console.log(`[Logging Gift] Room: ${username}, Gift: ${giftName}, SessionIds:`, Array.from(streamData.sessionIds));
                        streamData.sessionIds.forEach(sid => {
                            const plan = streamData.sessionPlans.get(sid) || 'free';
                            const shouldSaveToCloud = plan !== 'free';

                            liveLogsService.createLiveLog({
                                session_id: sid,
                                type: 'gift',
                                sender_name: data.nickname,
                                content: giftName,
                                quantity: repeatCount,
                                json_raw: data,
                                shouldSaveToCloud
                            }).catch(e => console.error(`[Logging Error] Gift for sid ${sid}:`, e.message));

                            // Log to local file if path exists
                            const storagePath = streamData.sessionPaths.get(sid);
                            if (storagePath) {
                                fileLogger.saveLogToFile(storagePath, sid, 'gift', { sender_name: data.nickname, content: giftName, quantity: repeatCount, raw: data }, username);
                            }
                        });
                    }
                });
            } 
            // 2. NẾU ĐÃ CÓ KẾT NỐI: Tức là client khác đã mở Live này trước đó
            else {
                console.log(`[*] Tái sử dụng kết nối TikTok Live cho: ${username}.`);
                const streamData = activeTiktokStreams.get(username);
                if (sessionId) {
                    streamData.sessionIds.add(sessionId);

                    // Fetch storage path for this session if not cached
                    if (!streamData.sessionPaths.has(sessionId)) {
                        pool.query(`
                            SELECT a.data_storage_path, a.role_id 
                            FROM live_sessions ls
                            JOIN tiktokers t ON t.id = ls.tiktoker_id
                            JOIN accounts a ON a.id = t.account_id
                            WHERE ls.id = $1
                        `, [sessionId]).then(res => {
                            const path = res.rows[0]?.data_storage_path;
                            const role_id = res.rows[0]?.role_id;
                            const plan = role_id === 1 ? 'pro' : 'free';
                            if (path) streamData.sessionPaths.set(sessionId, path);
                            streamData.sessionPlans.set(sessionId, plan);
                        }).catch(e => console.error('[DB Error V3] Fetch storage path error:', e.message));
                    }

                    // Nếu đã có thông tin room từ trước, cập nhật ngay cho session mới này
                    if (streamData.connection?.roomId) {
                        pool.query(
                            `UPDATE live_sessions 
                             SET room_id = $1, live_title = $2 
                             WHERE id = $3`,
                            [streamData.connection.roomId, streamData.connection.roomInfo?.data?.title || 'TikTok Live', sessionId]
                        ).catch(dbErr => console.error('[DB Error] Cập nhật session mới thất bại:', dbErr));
                    }
                }
                
                // Nếu stream đã connect xong, bắn trạng thái ngay lập tức cho người mới vào phòng
                if (!streamData.isConnecting) {
                    io.to(socket.id).emit('room_info', {
                        viewerCount: streamData.viewerCount,
                        likeCount: streamData.likeCount,
                        totalCoins: streamData.totalCoins,
                        chatCount: streamData.chatCount,
                        hostNickname: streamData.hostNickname,
                        hostAvatar: streamData.hostAvatar,
                        hostFollowers: streamData.hostFollowers
                    });
                    io.to(socket.id).emit('chat_history', streamData.chats);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log(`Đã thoát kết nối: ${socket.id}`);
            if (currentRoom && socket.sessionId) {
                const streamData = activeTiktokStreams.get(currentRoom);
                if (streamData) streamData.sessionIds.delete(socket.sessionId);
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

};
