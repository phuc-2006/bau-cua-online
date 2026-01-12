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
    const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
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
        setCreatingRoom(true);

        try {
            const code = generateRoomCode();

            // For now, just show the code (database integration will come later)
            setCreatedRoomCode(code);

            toast({
                title: "Tạo phòng thành công!",
                description: `Mã phòng của bạn: ${code}`,
            });
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

        setJoiningRoom(true);

        try {
            // For now, navigate to room page (database integration will come later)
            toast({
                title: "Đang tham gia phòng...",
                description: `Mã phòng: ${roomCode.toUpperCase()}`,
            });

            // Navigate to room (will be implemented with full database support)
            navigate(`/room/${roomCode.toUpperCase()}`);
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
                        className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30"
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

                        {createdRoomCode ? (
                            <div className="space-y-4">
                                <div className="bg-background rounded-xl p-4 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Mã phòng của bạn</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-3xl font-black text-primary tracking-widest">
                                            {createdRoomCode}
                                        </span>
                                        <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    variant="gameGold"
                                    size="lg"
                                    className="w-full"
                                    onClick={() => navigate(`/room/${createdRoomCode}`)}
                                >
                                    <Play className="w-5 h-5 mr-2" />
                                    Vào Phòng
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setCreatedRoomCode(null)}
                                >
                                    Tạo phòng khác
                                </Button>
                            </div>
                        ) : (
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
                                        Tạo Phòng Mới
                                    </>
                                )}
                            </Button>
                        )}
                    </motion.div>

                    {/* Join Room */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-card rounded-2xl p-6 shadow-xl border-2 border-border"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-card-foreground">Tham Gia Phòng</h3>
                                <p className="text-sm text-muted-foreground">Nhập mã phòng từ bạn bè</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="roomCode" className="text-card-foreground">
                                    Mã phòng
                                </Label>
                                <Input
                                    id="roomCode"
                                    placeholder="Nhập mã 6 ký tự..."
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    className="text-center text-2xl font-bold tracking-widest uppercase"
                                />
                            </div>

                            <Button
                                variant="gameOutline"
                                size="lg"
                                className="w-full"
                                onClick={handleJoinRoom}
                                disabled={joiningRoom || !roomCode.trim()}
                            >
                                {joiningRoom ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Đang tham gia...
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-5 h-5 mr-2" />
                                        Tham Gia
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>

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
