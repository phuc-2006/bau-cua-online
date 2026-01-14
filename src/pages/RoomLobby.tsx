import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Wallet,
    Loader2,
    Plus,
    Users,
    ArrowLeft,
    Play,
    Clock
} from "lucide-react";
import { formatMoney } from "@/lib/game";
import ProfileMenu from "@/components/game/ProfileMenu";

interface RoomWithCount {
    id: string;
    code: string;
    host_id: string;
    status: 'waiting' | 'playing' | 'finished';
    max_players: number;
    created_at: string;
    updated_at: string;
    player_count: number;
    host_username?: string;
}

const RoomLobby = () => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [joiningRoom, setJoiningRoom] = useState(false);
    const [roomCode, setRoomCode] = useState("");
    const [rooms, setRooms] = useState<RoomWithCount[]>([]);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Request sequence guard to prevent race conditions
    const fetchIdRef = useRef(0);

    // Fetch all data
    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate("/login");
                return;
            }

            setUser(session.user);

            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (profileData) {
                setProfile(profileData);
            }

            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .eq("role", "admin")
                .maybeSingle();

            setIsAdmin(!!roleData);
            setLoading(false);
        };

        fetchData();
    }, [navigate]);

    // Fetch rooms with player counts - with sequence guard
    const fetchRooms = useCallback(async () => {
        const currentFetchId = ++fetchIdRef.current;

        // Get all non-finished rooms
        const { data: roomsData } = await supabase
            .from("rooms")
            .select("*")
            .in("status", ["waiting", "playing"])
            .order("created_at", { ascending: false })
            .limit(20);

        // Check if this is still the latest request
        if (currentFetchId !== fetchIdRef.current) return;

        if (roomsData && roomsData.length > 0) {
            // Batch fetch: get all player counts in one query
            const roomIds = roomsData.map(r => r.id);

            // Get player counts for all rooms
            const { data: playerCounts } = await supabase
                .from("room_players")
                .select("room_id")
                .in("room_id", roomIds);

            // Check again if this is still the latest request
            if (currentFetchId !== fetchIdRef.current) return;

            // Count players per room
            const countMap = new Map<string, number>();
            (playerCounts || []).forEach(p => {
                countMap.set(p.room_id, (countMap.get(p.room_id) || 0) + 1);
            });

            // Get host usernames in batch
            const hostIds = [...new Set(roomsData.map(r => r.host_id))];
            const { data: hostProfiles } = await supabase
                .from("profiles")
                .select("user_id, username")
                .in("user_id", hostIds);

            // Final check before updating state
            if (currentFetchId !== fetchIdRef.current) return;

            const hostMap = new Map(
                (hostProfiles || []).map(p => [p.user_id, p.username])
            );

            // Build rooms with details, filtering out empty rooms
            const roomsWithDetails = roomsData
                .map(room => {
                    const playerCount = countMap.get(room.id) || 0;

                    // Skip rooms with no players (they should be auto-deleted by trigger)
                    if (playerCount === 0) return null;

                    return {
                        id: room.id,
                        code: room.code,
                        host_id: room.host_id,
                        status: room.status as 'waiting' | 'playing' | 'finished',
                        max_players: room.max_players,
                        created_at: room.created_at,
                        updated_at: room.updated_at,
                        player_count: playerCount,
                        host_username: hostMap.get(room.host_id) || 'Ẩn danh'
                    };
                })
                .filter((r): r is NonNullable<typeof r> => r !== null) as RoomWithCount[];

            setRooms(roomsWithDetails);
        } else {
            if (currentFetchId === fetchIdRef.current) {
                setRooms([]);
            }
        }
    }, []);

    useEffect(() => {
        fetchRooms();

        // Realtime subscription for rooms and room_players
        const channel = supabase
            .channel('lobby-rooms')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rooms' },
                () => fetchRooms()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'room_players' },
                () => fetchRooms()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRooms]);

    // Polling fallback - refresh room list every 5 seconds (reduced frequency)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchRooms();
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchRooms]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const generateRoomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreateRoom = async () => {
        if (!user) return;
        setCreatingRoom(true);

        try {
            const code = generateRoomCode();

            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .insert({
                    code: code,
                    host_id: user.id,
                    status: 'waiting',
                    max_players: 6
                })
                .select()
                .single();

            if (roomError) throw roomError;

            const { error: playerError } = await supabase
                .from("room_players")
                .insert({
                    room_id: roomData.id,
                    user_id: user.id
                });

            if (playerError) throw playerError;

            toast({
                title: "Tạo phòng thành công!",
                description: `Đang vào phòng ${code}...`,
            });

            navigate(`/room/${roomData.id}`);

        } catch (error: any) {
            toast({
                title: "Lỗi tạo phòng",
                description: error.message || "Có lỗi xảy ra, vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setCreatingRoom(false);
        }
    };

    const handleJoinRoom = async (targetRoomCode?: string) => {
        const codeToJoin = targetRoomCode || roomCode.trim().toUpperCase();

        if (!codeToJoin) {
            toast({
                title: "Thiếu mã phòng",
                description: "Vui lòng nhập mã phòng để tham gia.",
                variant: "destructive",
            });
            return;
        }

        if (!user) return;
        setJoiningRoom(true);

        try {
            // Find room by code (both waiting and playing)
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("code", codeToJoin)
                .in("status", ["waiting", "playing"])
                .maybeSingle();

            if (roomError) throw roomError;

            if (!roomData) {
                toast({
                    title: "Không tìm thấy phòng",
                    description: "Mã phòng không tồn tại hoặc phòng đã kết thúc.",
                    variant: "destructive",
                });
                setJoiningRoom(false);
                return;
            }

            // Check if room is full
            const { count } = await supabase
                .from("room_players")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomData.id);

            if (count && count >= roomData.max_players) {
                toast({
                    title: "Phòng đã đầy",
                    description: "Phòng này đã đạt số người chơi tối đa.",
                    variant: "destructive",
                });
                setJoiningRoom(false);
                return;
            }

            // Check if already in room
            const { data: existingPlayer } = await supabase
                .from("room_players")
                .select("id")
                .eq("room_id", roomData.id)
                .eq("user_id", user.id)
                .maybeSingle();

            if (!existingPlayer) {
                const { error: joinError } = await supabase
                    .from("room_players")
                    .insert({
                        room_id: roomData.id,
                        user_id: user.id
                    });

                if (joinError) throw joinError;
            }

            toast({
                title: "Tham gia thành công!",
                description: roomData.status === 'playing'
                    ? "Phòng đang chơi, bạn sẽ chơi ở vòng tiếp theo."
                    : `Đang vào phòng ${codeToJoin}...`,
            });

            // Navigate to room (Room.tsx will handle redirect to game if playing)
            navigate(`/room/${roomData.id}`);

        } catch (error: any) {
            toast({
                title: "Lỗi tham gia phòng",
                description: error.message || "Có lỗi xảy ra, vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setJoiningRoom(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    const waitingRooms = rooms.filter(r => r.status === 'waiting');
    const playingRooms = rooms.filter(r => r.status === 'playing');

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <Link to="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-black text-foreground game-title">
                        🎲 Chế Độ Online
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/deposit">
                        <Button variant="game" size="sm" className="flex items-center gap-1">
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">Nạp</span>
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-full font-bold shadow-lg text-sm md:text-base">
                        <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                        {formatMoney(profile?.balance || 0)}
                    </div>

                    <ProfileMenu
                        username={profile?.username || "Người chơi"}
                        balance={profile?.balance || 0}
                        isAdmin={isAdmin}
                        onLogout={handleLogout}
                    />
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h2 className="text-3xl font-bold text-foreground mb-2">Chơi cùng bạn bè</h2>
                    <p className="text-muted-foreground">Tạo phòng hoặc tham gia phòng để chơi online</p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Create Room */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30 bg-gradient-to-br from-card to-primary/5"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                                <Plus className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-card-foreground">Tạo Phòng</h3>
                                <p className="text-sm text-muted-foreground">Làm chủ phòng, mời bạn bè</p>
                            </div>
                        </div>

                        <Button
                            variant="gameGold"
                            size="lg"
                            className="w-full"
                            onClick={handleCreateRoom}
                            disabled={creatingRoom}
                        >
                            {creatingRoom ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 mr-2" />
                                    Tạo Phòng Ngay
                                </>
                            )}
                        </Button>
                    </motion.div>

                    {/* Join Room */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-card rounded-2xl p-6 shadow-xl border-2 border-border bg-gradient-to-br from-card to-muted/50"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-card-foreground">Tham Gia</h3>
                                <p className="text-sm text-muted-foreground">Nhập mã phòng có sẵn</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input
                                placeholder="Mã phòng..."
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="text-center text-2xl font-bold tracking-widest uppercase bg-background"
                            />

                            <Button
                                variant="gameOutline"
                                size="lg"
                                className="w-full"
                                onClick={() => handleJoinRoom()}
                                disabled={joiningRoom || !roomCode.trim()}
                            >
                                {joiningRoom ? "Đang vào..." : "Vào Ngay"}
                            </Button>
                        </div>
                    </motion.div>
                </div>

                {/* Waiting Rooms */}
                {waitingRooms.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-10"
                    >
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            Phòng Đang Chờ ({waitingRooms.length})
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {waitingRooms.map((room) => (
                                <div key={room.id} className="bg-card p-4 rounded-xl border-2 border-yellow-500/30 shadow-md hover:border-yellow-500 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-lg text-primary">{room.code}</span>
                                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-full font-medium">
                                            Đang chờ
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Host: {room.host_username}
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        <Users className="w-4 h-4 inline mr-1" />
                                        {room.player_count}/{room.max_players} người
                                    </p>
                                    <Button
                                        variant="gameOutline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleJoinRoom(room.code)}
                                        disabled={joiningRoom}
                                    >
                                        Tham gia
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Playing Rooms */}
                {playingRooms.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-10"
                    >
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <Play className="w-5 h-5 text-green-500" />
                            Phòng Đang Chơi ({playingRooms.length})
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playingRooms.map((room) => (
                                <div key={room.id} className="bg-card p-4 rounded-xl border-2 border-green-500/30 shadow-md hover:border-green-500 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-lg text-primary">{room.code}</span>
                                        <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded-full font-medium">
                                            Đang chơi
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Host: {room.host_username}
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        <Users className="w-4 h-4 inline mr-1" />
                                        {room.player_count}/{room.max_players} người
                                    </p>
                                    <Button
                                        variant="gameOutline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleJoinRoom(room.code)}
                                        disabled={joiningRoom}
                                    >
                                        Xem / Tham gia
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {rooms.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-10 text-center p-8 bg-muted/30 rounded-2xl border-2 border-dashed border-muted-foreground/20"
                    >
                        <p className="text-muted-foreground text-lg mb-2">Chưa có phòng nào</p>
                        <p className="text-sm text-muted-foreground">Hãy tạo phòng đầu tiên hoặc đợi bạn bè tạo phòng!</p>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-center text-sm text-muted-foreground"
                >
                    <p>💡 Chia sẻ mã phòng cho bạn bè để chơi cùng nhau</p>
                </motion.div>
            </div>
        </div>
    );
};

export default RoomLobby;
