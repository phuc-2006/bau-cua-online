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

const Room = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isHost, setIsHost] = useState(false);
    const [players, setPlayers] = useState<Array<{ id: string; username: string; isHost: boolean }>>([]);
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

                // Simulate being the host if first to join
                // In real implementation, this would check the database
                setIsHost(true);
                setPlayers([
                    { id: session.user.id, username: profileData.username, isHost: true }
                ]);
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const copyRoomCode = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId);
            toast({
                title: "Đã sao chép!",
                description: "Mã phòng đã được sao chép vào clipboard.",
            });
        }
    };

    const handleStartGame = () => {
        toast({
            title: "Bắt đầu game!",
            description: "Đang khởi động trò chơi...",
        });
        // In real implementation, this would start the multiplayer game
        navigate("/game");
    };

    const handleLeaveRoom = () => {
        toast({
            title: "Rời phòng",
            description: "Bạn đã rời khỏi phòng.",
        });
        navigate("/rooms");
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
                                {roomId}
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
                            Người chơi ({players.length}/6)
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {players.map((player, index) => (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="flex items-center justify-between p-3 bg-background rounded-xl"
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

                        {/* Empty slots */}
                        {Array.from({ length: 6 - players.length }).map((_, index) => (
                            <div
                                key={`empty-${index}`}
                                className="flex items-center justify-center p-3 bg-muted/50 rounded-xl border-2 border-dashed border-border"
                            >
                                <span className="text-muted-foreground text-sm">
                                    Đang chờ người chơi...
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
