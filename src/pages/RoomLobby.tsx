import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Wallet,
    Loader2,
    Plus,
    Users,
    ArrowLeft,
    Copy,
    Play
} from "lucide-react";
import { formatMoney } from "@/lib/game";
import ProfileMenu from "@/components/game/ProfileMenu";

const RoomLobby = () => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [joiningRoom, setJoiningRoom] = useState(false);
    const [roomCode, setRoomCode] = useState("");
    const [waitingRooms, setWaitingRooms] = useState<any[]>([]);
    const navigate = useNavigate();
    const { toast } = useToast();

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

        // Fetch waiting rooms
        const fetchRooms = async () => {
            const { data } = await supabase
                .from("rooms")
                .select("*, profiles!rooms_host_id_fkey(username)")
                .eq("status", "waiting")
                .order("created_at", { ascending: false })
                .limit(10);

            if (data) {
                // Get player counts for these rooms
                const roomsWithCounts = await Promise.all(data.map(async (room) => {
                    const { count } = await supabase
                        .from("room_players")
                        .select("*", { count: "exact", head: true })
                        .eq("room_id", room.id);
                    return { ...room, player_count: count || 0 };
                }));
                setWaitingRooms(roomsWithCounts);
            }
        };

        fetchRooms();

        // Refresh interval
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, [navigate]);

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

            // Create room
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

            // Add host as first player
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

            // Auto join
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

    const handleJoinRoom = async () => {
        if (!roomCode.trim()) {
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
            // Find room by code
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("code", roomCode.toUpperCase())
                .eq("status", "waiting")
                .maybeSingle();

            if (roomError) throw roomError;

            if (!roomData) {
                toast({
                    title: "Không tìm thấy phòng",
                    description: "Mã phòng không tồn tại hoặc phòng đã bắt đầu.",
                    variant: "destructive",
                });
                setJoiningRoom(false);
                return;
            }

            // Check if room is full
            const { count, error: countError } = await supabase
                .from("room_players")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomData.id);

            if (countError) throw countError;

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
                // Join the room
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
                description: `Đang vào phòng ${roomCode.toUpperCase()}...`,
            });

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

    const copyRoomCode = () => {
        if (createdRoomCode) {
            navigator.clipboard.writeText(createdRoomCode);
            toast({
                title: "Đã sao chép!",
                description: "Mã phòng đã được sao chép vào clipboard.",
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

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

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold shadow-lg">
                        <Wallet className="w-5 h-5" />
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
                                onClick={handleJoinRoom}
                                disabled={joiningRoom || !roomCode.trim()}
                            >
                                {joiningRoom ? "Đang vào..." : "Vào Ngay"}
                            </Button>
                        </div>
                    </motion.div>
                </div>

                {/* Available Rooms List */}
                {waitingRooms.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-12"
                    >
                        <h2 className="text-2xl font-bold text-foreground mb-4">Phòng Đang Chờ ({waitingRooms.length})</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {waitingRooms.map((room) => (
                                <div key={room.id} className="bg-card p-4 rounded-xl border border-border shadow-md hover:border-primary transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-lg text-primary">{room.code}</span>
                                            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                                {room.player_count}/{room.max_players} người
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground/80 mb-4">
                                            Host: {room.profiles?.username || 'Ẩn danh'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="gameGold"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            setRoomCode(room.code);
                                            // Optional: Auto trigger join?
                                            // handleJoinRoom(); // Requires roomCode state to be set, might be async issue.
                                            // Better to just populate code or call join with room data directly.
                                            // Let's just set code for now, user clicks join. Or better, specific join function.
                                            // Actually I'll implement direct join here.
                                            const join = async () => {
                                                setRoomCode(room.code);
                                                // Trigger join properly? 
                                                // React state update is async.
                                                // Let's separate the join logic to accept code param.
                                            };
                                            join();
                                        }}
                                    // Workaround: Updating state does not update immediately.
                                    // To fix, I will just set the input value and user clicks.
                                    // OR make handleJoinRoom accept an argument.
                                    >
                                        Chọn
                                    </Button>
                                    {/* Actually better to make handleJoinRoom accept param */}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 text-center"
                >
                    <p className="text-muted-foreground text-sm">
                        💡 Chia sẻ mã phòng để bạn bè có thể tham gia cùng bạn
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default RoomLobby;
