import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Wallet,
    Loader2,
    ArrowLeft,
    Copy,
    Play,
    Users,
    Crown,
    LogOut
} from "lucide-react";
import { formatMoney } from "@/lib/game";
import ProfileMenu from "@/components/game/ProfileMenu";

interface Player {
    id: string;
    username: string;
    isHost: boolean;
    odlUserId: string;
}

const Room = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<any>(null);
    const [isHost, setIsHost] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Fetch room data and players
    const fetchRoomData = async (userId: string) => {
        if (!roomId) return;

        // Fetch room info
        const { data: roomData, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .maybeSingle();

        if (roomError || !roomData) {
            toast({
                title: "Lỗi",
                description: "Không tìm thấy phòng.",
                variant: "destructive",
            });
            navigate("/rooms");
            return;
        }

        // If room is already playing, redirect to game
        if (roomData.status === 'playing') {
            navigate(`/baucua/online/${roomId}`);
            return;
        }

        setRoom(roomData);
        setIsHost(roomData.host_id === userId);

        // Fetch players from room_players
        const { data: playersData, error: playersError } = await supabase
            .from("room_players")
            .select("id, user_id")
            .eq("room_id", roomId);

        if (!playersError && playersData) {
            // Fetch profiles for all players
            const userIds = playersData.map(p => p.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, username")
                .in("user_id", userIds);

            const profilesMap = new Map(
                (profilesData || []).map(p => [p.user_id, p.username])
            );

            const formattedPlayers = playersData.map((p: any) => ({
                id: p.id,
                username: profilesMap.get(p.user_id) || "Người chơi ẩn danh",
                isHost: p.user_id === roomData.host_id,
                odlUserId: p.user_id
            }));
            setPlayers(formattedPlayers);
        } else if (playersError) {
            console.error("Error fetching players:", playersError);
        }
    };

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

            await fetchRoomData(session.user.id);
            setLoading(false);
        };

        fetchData();
    }, [navigate, roomId]);

    // Realtime subscription for players
    useEffect(() => {
        if (!roomId || !user) return;

        const channel = supabase
            .channel(`room-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'room_players',
                    filter: `room_id=eq.${roomId}`
                },
                () => {
                    // Refetch players when changes occur
                    fetchRoomData(user.id);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${roomId}`
                },
                (payload) => {
                    const newRoomData = payload.new as any;

                    // Handle room status changes (e.g., game started)
                    if (newRoomData.status === 'playing') {
                        navigate(`/baucua/online/${roomId}`);
                    }

                    // Handle host transfer
                    if (newRoomData.host_id) {
                        setRoom(prev => prev ? { ...prev, host_id: newRoomData.host_id } : null);
                        setIsHost(newRoomData.host_id === user.id);

                        if (newRoomData.host_id === user.id) {
                            toast({
                                title: "Bạn là chủ phòng mới!",
                                description: "Quyền chủ phòng đã được chuyển cho bạn.",
                            });
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${roomId}`
                },
                () => {
                    toast({
                        title: "Phòng đã đóng",
                        description: "Phòng đã bị xóa.",
                        variant: "destructive",
                    });
                    navigate("/rooms");
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, user, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const copyRoomCode = () => {
        if (room?.code) {
            navigator.clipboard.writeText(room.code);
            toast({
                title: "Đã sao chép!",
                description: "Mã phòng đã được sao chép vào clipboard.",
            });
        }
    };

    const handleStartGame = async () => {
        if (!roomId || !isHost) return;

        try {
            // Update room status to playing
            const { error: roomError } = await supabase
                .from("rooms")
                .update({ status: 'playing' })
                .eq("id", roomId);

            if (roomError) throw roomError;

            // Create a new game session
            const { error: sessionError } = await supabase
                .from("game_sessions")
                .insert({
                    room_id: roomId,
                    status: 'betting'
                });

            if (sessionError) throw sessionError;

            toast({
                title: "Bắt đầu game!",
                description: "Đang khởi động trò chơi...",
            });

            navigate(`/baucua/online/${roomId}`);
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Không thể bắt đầu game.",
                variant: "destructive",
            });
        }
    };

    const handleLeaveRoom = async () => {
        if (!roomId || !user) return;

        try {
            // Remove player from room
            await supabase
                .from("room_players")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", user.id);

            // If host leaves, transfer host to another player
            if (isHost) {
                // Get remaining players
                const { data: remainingPlayers } = await supabase
                    .from("room_players")
                    .select("user_id")
                    .eq("room_id", roomId)
                    .limit(1);

                if (remainingPlayers && remainingPlayers.length > 0) {
                    // Transfer host to first remaining player
                    await supabase
                        .from("rooms")
                        .update({ host_id: remainingPlayers[0].user_id })
                        .eq("id", roomId);

                    toast({
                        title: "Rời phòng",
                        description: "Bạn đã rời khỏi phòng. Quyền chủ phòng đã được chuyển giao.",
                    });
                } else {
                    // No players left, delete the room
                    await supabase
                        .from("rooms")
                        .delete()
                        .eq("id", roomId);

                    toast({
                        title: "Phòng đã đóng",
                        description: "Bạn là người cuối cùng, phòng đã được xóa.",
                    });
                }
            } else {
                toast({
                    title: "Rời phòng",
                    description: "Bạn đã rời khỏi phòng.",
                });
            }

            navigate("/rooms");
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Có lỗi xảy ra.",
                variant: "destructive",
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
                    <Link to="/rooms">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-black text-foreground game-title">
                        🎲 Phòng Chờ
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
            <div className="max-w-2xl mx-auto p-6">
                {/* Room Code Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30 mb-6"
                >
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Mã phòng</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-4xl font-black text-primary tracking-widest">
                                {room?.code || roomId}
                            </span>
                            <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                                <Copy className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Chia sẻ mã này để bạn bè tham gia
                        </p>
                    </div>
                </motion.div>

                {/* Players List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card rounded-2xl p-6 shadow-xl border-2 border-border mb-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-bold text-card-foreground">
                            Người chơi ({players.length}/{room?.max_players || 6})
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {players.map((player, index) => (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-secondary"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-lg">
                                        {player.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-foreground">
                                        {player.username}
                                    </span>
                                </div>
                                {player.isHost && (
                                    <div className="flex items-center gap-1 bg-primary/20 px-2 py-1 rounded-full text-xs text-primary font-medium">
                                        <Crown className="w-3 h-3" />
                                        Chủ phòng
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {Array.from({ length: (room?.max_players || 6) - players.length }).map((_, index) => (
                            <div
                                key={`empty-${index}`}
                                className="flex items-center justify-center p-4 bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20"
                            >
                                <span className="text-muted-foreground text-sm font-medium">
                                    Đang chờ...
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-4"
                >
                    {isHost ? (
                        <Button
                            variant="gameGold"
                            size="lg"
                            className="flex-1"
                            onClick={handleStartGame}
                            disabled={players.length < 1}
                        >
                            <Play className="w-5 h-5 mr-2" />
                            Bắt đầu game
                        </Button>
                    ) : (
                        <div className="flex-1 bg-muted rounded-xl p-4 text-center">
                            <p className="text-muted-foreground">
                                Đang chờ chủ phòng bắt đầu...
                            </p>
                        </div>
                    )}

                    <Button
                        variant="gameDanger"
                        size="lg"
                        onClick={handleLeaveRoom}
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        Rời phòng
                    </Button>
                </motion.div>

                {/* Info */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-muted-foreground text-sm mt-6"
                >
                    💡 Chủ phòng có thể bắt đầu game khi có ít nhất 1 người chơi
                </motion.p>
            </div>
        </div>
    );
};

export default Room;
