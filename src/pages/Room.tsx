import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    const [isLeaving, setIsLeaving] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Request sequence guard to prevent race conditions
    const fetchIdRef = useRef(0);
    // Track if user has left (to prevent duplicate leaves)
    const hasLeftRef = useRef(false);
    // Track if navigating to game (to prevent auto-leave when game starts)
    const isNavigatingToGameRef = useRef(false);

    // Idempotent leave function - safe to call multiple times
    const leaveRoom = useCallback(async (userId: string, showToast = true) => {
        if (!roomId || hasLeftRef.current) return;

        hasLeftRef.current = true;

        try {
            const { error } = await supabase
                .from("room_players")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", userId);

            // Ignore "not found" errors - player might already have left
            if (error && !error.message?.includes('No rows')) {
                console.error("Leave room error:", error);
            }

            if (showToast) {
                toast({
                    title: "Rời phòng",
                    description: "Bạn đã rời khỏi phòng.",
                });
            }
        } catch (err) {
            console.error("Leave room exception:", err);
        }
    }, [roomId, toast]);

    // Fetch room data and players with sequence guard
    const fetchRoomData = useCallback(async (userId: string) => {
        if (!roomId) return;

        const currentFetchId = ++fetchIdRef.current;

        // Fetch room info
        const { data: roomData, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .maybeSingle();

        // Check if this is still the latest request
        if (currentFetchId !== fetchIdRef.current) return;

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
            isNavigatingToGameRef.current = true;
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

        // Check again if this is still the latest request
        if (currentFetchId !== fetchIdRef.current) return;

        if (!playersError && playersData) {
            // Fetch profiles for all players
            const userIds = playersData.map(p => p.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, username")
                .in("user_id", userIds);

            // Final check before updating state
            if (currentFetchId !== fetchIdRef.current) return;

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
    }, [roomId, navigate, toast]);

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
    }, [navigate, roomId, fetchRoomData]);

    // Polling fallback - refetch every 2 seconds for reliable sync
    useEffect(() => {
        if (!roomId || !user || loading) return;

        const interval = setInterval(() => {
            console.log('[Room] Polling refetch...');
            fetchRoomData(user.id);
        }, 2000);

        return () => clearInterval(interval);
    }, [roomId, user, loading, fetchRoomData]);

    // Auto-leave on unmount and page visibility/close
    useEffect(() => {
        if (!roomId || !user) return;

        // Handle page visibility change (tab switch, minimize)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && !hasLeftRef.current) {
                // Fire-and-forget leave when tab becomes hidden
                // Using sendBeacon would be ideal but Supabase doesn't support it
                // This is a best-effort attempt
            }
        };

        // Handle page unload (close tab, navigate away)
        const handleBeforeUnload = () => {
            if (!hasLeftRef.current && user?.id) {
                // Synchronous attempt to leave - won't always work
                // The DB trigger will clean up orphaned players eventually
                navigator.sendBeacon && navigator.sendBeacon(
                    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/room_players?room_id=eq.${roomId}&user_id=eq.${user.id}`,
                    ''
                );
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup on unmount - attempt to leave room
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // Only auto-leave if we haven't explicitly left and not navigating to game
            // Skip auto-leave when transitioning to the game screen
            if (!hasLeftRef.current && !isNavigatingToGameRef.current && user?.id) {
                // Fire-and-forget leave on unmount
                supabase
                    .from("room_players")
                    .delete()
                    .eq("room_id", roomId)
                    .eq("user_id", user.id)
                    .then(() => { });
            }
        };
    }, [roomId, user]);

    // Realtime subscription for players, room updates, and game_sessions
    useEffect(() => {
        if (!roomId || !user) return;

        // Invalidate pending fetches and refetch
        const refetchData = () => {
            fetchIdRef.current += 1;
            fetchRoomData(user.id);
        };

        // Helper: add player locally
        const addPlayerLocal = async (userId?: string, rowId?: string) => {
            if (!userId || !rowId) return;
            fetchIdRef.current += 1;

            // Check if already exists
            setPlayers(prev => {
                if (prev.some(p => p.id === rowId || p.odlUserId === userId)) return prev;
                return [...prev, { id: rowId, username: "Đang tải...", isHost: false, odlUserId: userId }];
            });

            // Hydrate username + host flag
            const [{ data: profileData }, { data: roomData }] = await Promise.all([
                supabase.from("profiles").select("user_id, username").eq("user_id", userId).maybeSingle(),
                supabase.from("rooms").select("host_id").eq("id", roomId).maybeSingle(),
            ]);

            setPlayers(prev => prev.map(p => {
                if (p.id !== rowId && p.odlUserId !== userId) return p;
                return {
                    ...p,
                    username: profileData?.username || p.username || "Người chơi ẩn danh",
                    isHost: userId === roomData?.host_id,
                };
            }));
        };

        // Helper: remove player locally (no refetch needed)
        const removePlayerLocal = (userId?: string, rowId?: string) => {
            if (!userId && !rowId) return;
            fetchIdRef.current += 1;
            setPlayers(prev => {
                const filtered = prev.filter(p => {
                    const matchId = rowId && p.id === rowId;
                    const matchUserId = userId && p.odlUserId === userId;
                    return !matchId && !matchUserId;
                });
                return filtered;
            });
        };

        const channel = supabase
            .channel(`room-realtime-${roomId}`)
            // Listen for player JOIN
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'room_players',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    console.log('[Room] Realtime INSERT received:', payload);
                    const row = payload.new as any;
                    void addPlayerLocal(row?.user_id, row?.id);
                }
            )
            // Listen for player LEAVE (no filter, check room_id manually)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'room_players'
                },
                (payload) => {
                    const oldRow = payload.old as any;
                    if (oldRow?.room_id !== roomId) return;
                    removePlayerLocal(oldRow?.user_id, oldRow?.id);
                }
            )
            // Listen for game_sessions INSERT (backup for game start)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `room_id=eq.${roomId}`
                },
                () => {
                    // Game session created - redirect to game
                    isNavigatingToGameRef.current = true;
                    navigate(`/baucua/online/${roomId}`);
                }
            )
            // Listen for room UPDATE
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
                        isNavigatingToGameRef.current = true;
                        navigate(`/baucua/online/${roomId}`);
                        return;
                    }

                    // Handle host transfer
                    if (newRoomData.host_id) {
                        setRoom(prev => prev ? { ...prev, host_id: newRoomData.host_id } : null);
                        setIsHost(newRoomData.host_id === user.id);

                        // Update isHost flags for all players locally
                        setPlayers(prev => prev.map(p => ({
                            ...p,
                            isHost: p.odlUserId === newRoomData.host_id
                        })));

                        if (newRoomData.host_id === user.id) {
                            toast({
                                title: "Bạn là chủ phòng mới!",
                                description: "Quyền chủ phòng đã được chuyển cho bạn.",
                            });
                        }
                    }
                }
            )
            // Listen for room DELETE
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
                    hasLeftRef.current = true;
                    navigate("/rooms");
                }
            )
            .subscribe((status) => {
                console.log('[Room] Realtime subscription status:', status);
            });

        return () => {
            console.log('[Room] Removing realtime channel');
            supabase.removeChannel(channel);
        };
    }, [roomId, user, navigate, toast, fetchRoomData]);

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

            isNavigatingToGameRef.current = true;
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
        if (!roomId || !user || isLeaving) return;

        setIsLeaving(true);

        try {
            await leaveRoom(user.id, true);
            navigate("/rooms");
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Có lỗi xảy ra.",
                variant: "destructive",
            });
            hasLeftRef.current = false; // Reset so user can try again
        } finally {
            setIsLeaving(false);
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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLeaveRoom}
                        disabled={isLeaving}
                    >
                        {isLeaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowLeft className="w-4 h-4 mr-2" />
                        )}
                        Sảnh chờ
                    </Button>
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
                        disabled={isLeaving}
                    >
                        {isLeaving ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <LogOut className="w-5 h-5 mr-2" />
                        )}
                        Rời phòng
                    </Button>
                </motion.div>

                {/* Room Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-center text-sm text-muted-foreground"
                >
                    <p>💡 Khi đủ người, chủ phòng có thể bắt đầu game</p>
                </motion.div>
            </div>
        </div>
    );
};

export default Room;
