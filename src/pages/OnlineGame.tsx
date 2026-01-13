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
    Dice5,
    Users,
    Crown,
    RotateCcw
} from "lucide-react";
import { ANIMALS, BET_AMOUNTS, AnimalType, formatMoney } from "@/lib/game";
import ProfileMenu from "@/components/game/ProfileMenu";
import AnimalCard from "@/components/game/AnimalCard";
import BetSelector from "@/components/game/BetSelector";
import DiceBowl from "@/components/game/DiceBowl";

interface Player {
    id: string;
    username: string;
    isHost: boolean;
    odlUserId: string;
}

interface GameSession {
    id: string;
    room_id: string;
    dice_results: AnimalType[] | null;
    status: 'betting' | 'rolling' | 'revealed' | 'settled';
}

const OnlineGame = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<any>(null);
    const [isHost, setIsHost] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [session, setSession] = useState<GameSession | null>(null);

    // Game state
    const [selectedBetAmount, setSelectedBetAmount] = useState(BET_AMOUNTS[0]);
    const [bets, setBets] = useState<Record<AnimalType, number>>({
        nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
    });
    const [isShaking, setIsShaking] = useState(false);
    const [canReveal, setCanReveal] = useState(false);
    const [winCounts, setWinCounts] = useState<Record<AnimalType, number>>({
        nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
    });
    const [lastWinnings, setLastWinnings] = useState<number | null>(null);

    const navigate = useNavigate();
    const { toast } = useToast();

    const totalBet = Object.values(bets).reduce((sum, bet) => sum + bet, 0);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            const { data: { session: authSession } } = await supabase.auth.getSession();

            if (!authSession) {
                navigate("/login");
                return;
            }

            setUser(authSession.user);

            // Fetch profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", authSession.user.id)
                .maybeSingle();

            if (profileData) {
                setProfile(profileData);
            }

            // Check admin
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", authSession.user.id)
                .eq("role", "admin")
                .maybeSingle();

            setIsAdmin(!!roleData);

            // Fetch room
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

            setRoom(roomData);
            setIsHost(roomData.host_id === authSession.user.id);

            // Fetch players
            await fetchPlayers();

            // Fetch current session
            const { data: sessionData } = await supabase
                .from("game_sessions")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sessionData) {
                setSession(sessionData as GameSession);

                // If session is revealed, show results
                if (sessionData.status === 'revealed' && sessionData.dice_results) {
                    handleDiceRevealed(sessionData.dice_results as AnimalType[]);
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [navigate, roomId]);

    // Fetch players helper
    const fetchPlayers = async () => {
        if (!roomId) return;

        const { data: playersData } = await supabase
            .from("room_players")
            .select("id, user_id")
            .eq("room_id", roomId);

        if (playersData) {
            const userIds = playersData.map(p => p.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, username")
                .in("user_id", userIds);

            const profilesMap = new Map(
                (profilesData || []).map(p => [p.user_id, p.username])
            );

            const { data: roomData } = await supabase
                .from("rooms")
                .select("host_id")
                .eq("id", roomId)
                .maybeSingle();

            const formattedPlayers = playersData.map((p: any) => ({
                id: p.id,
                username: profilesMap.get(p.user_id) || "Người chơi ẩn danh",
                isHost: p.user_id === roomData?.host_id,
                odlUserId: p.user_id
            }));
            setPlayers(formattedPlayers);
        }
    };

    // Realtime subscriptions
    useEffect(() => {
        if (!roomId || !session?.id) return;

        const channel = supabase
            .channel(`online-game-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `id=eq.${session.id}`
                },
                (payload) => {
                    const newSession = payload.new as GameSession;
                    setSession(newSession);

                    if (newSession.status === 'rolling') {
                        setIsShaking(true);
                        setCanReveal(false);
                    } else if (newSession.status === 'revealed' && newSession.dice_results) {
                        setIsShaking(false);
                        setCanReveal(true);
                        // Auto reveal after short delay
                        setTimeout(() => {
                            handleDiceRevealed(newSession.dice_results as AnimalType[]);
                        }, 500);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'room_players',
                    filter: `room_id=eq.${roomId}`
                },
                () => {
                    fetchPlayers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, session?.id]);

    // Handle dice revealed
    const handleDiceRevealed = (diceResults: AnimalType[]) => {
        // Count occurrences
        const counts: Record<AnimalType, number> = { nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 };
        diceResults.forEach(r => counts[r]++);
        setWinCounts(counts);

        // Calculate winnings
        let winnings = 0;
        Object.entries(bets).forEach(([animal, betAmount]) => {
            const animalType = animal as AnimalType;
            const count = counts[animalType];
            if (betAmount > 0 && count > 0) {
                winnings += betAmount + (betAmount * count);
            }
        });

        const netChange = winnings - totalBet;
        setLastWinnings(netChange);

        // Update balance
        if (profile && (winnings > 0 || totalBet > 0)) {
            const newBalance = profile.balance + winnings;
            setProfile({ ...profile, balance: newBalance });

            // Update in database
            supabase
                .from("profiles")
                .update({ balance: newBalance })
                .eq("user_id", user.id)
                .then();
        }

        // Show toast
        if (netChange > 0) {
            toast({
                title: "🎉 Thắng!",
                description: `Bạn thắng ${formatMoney(netChange)}`,
            });
        } else if (netChange < 0) {
            toast({
                title: "😢 Thua rồi!",
                description: `Bạn thua ${formatMoney(Math.abs(netChange))}`,
                variant: "destructive",
            });
        } else if (totalBet > 0) {
            toast({
                title: "🤝 Hòa!",
                description: "Bạn không thắng không thua.",
            });
        }

        setCanReveal(false);
    };

    // Handle betting
    const handleAnimalClick = (animalId: AnimalType) => {
        if (isShaking || session?.status !== 'betting') return;

        if (profile.balance < selectedBetAmount) {
            toast({
                title: "Không đủ tiền!",
                description: "Số dư của bạn không đủ để đặt cược thêm.",
                variant: "destructive",
            });
            return;
        }

        // Deduct money
        const newBalance = profile.balance - selectedBetAmount;
        setProfile({ ...profile, balance: newBalance });

        setBets(prev => ({
            ...prev,
            [animalId]: prev[animalId] + selectedBetAmount
        }));
    };

    // Clear bets
    const handleClearBets = () => {
        if (isShaking || session?.status !== 'betting') return;

        // Refund
        setProfile({ ...profile, balance: profile.balance + totalBet });
        setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
    };

    // Host shake dice
    const handleShake = async () => {
        if (!isHost || !session) return;

        try {
            // Update session status to rolling
            await supabase
                .from("game_sessions")
                .update({ status: 'rolling' })
                .eq("id", session.id);

            setIsShaking(true);

            // Generate dice results after 2 seconds
            setTimeout(async () => {
                const animalIds: AnimalType[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
                const diceResults: AnimalType[] = [
                    animalIds[Math.floor(Math.random() * 6)],
                    animalIds[Math.floor(Math.random() * 6)],
                    animalIds[Math.floor(Math.random() * 6)],
                ];

                // Update session with results
                await supabase
                    .from("game_sessions")
                    .update({
                        status: 'revealed',
                        dice_results: diceResults
                    })
                    .eq("id", session.id);
            }, 2000);
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Không thể lắc xúc xắc.",
                variant: "destructive",
            });
        }
    };

    // New round
    const handleNewRound = async () => {
        if (!isHost || !roomId) return;

        try {
            // Create new session
            const { data: newSession, error } = await supabase
                .from("game_sessions")
                .insert({
                    room_id: roomId,
                    status: 'betting'
                })
                .select()
                .single();

            if (error) throw error;

            setSession(newSession as GameSession);
            setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
            setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
            setLastWinnings(null);
            setIsShaking(false);
            setCanReveal(false);

            toast({
                title: "Vòng mới!",
                description: "Hãy đặt cược vào con vật bạn chọn.",
            });
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Không thể tạo vòng mới.",
                variant: "destructive",
            });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const handleBowlRevealed = () => {
        if (session?.dice_results) {
            handleDiceRevealed(session.dice_results);
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
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <Link to={`/room/${roomId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Phòng chờ
                        </Button>
                    </Link>
                    <h1 className="text-xl md:text-2xl font-black text-foreground game-title">
                        🎲 Bầu Cua Online
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm">
                        <Users className="w-4 h-4" />
                        {players.length} người chơi
                    </div>
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

            {/* Status bar */}
            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mã phòng:</span>
                    <span className="font-bold text-primary">{room?.code}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${session?.status === 'betting' ? 'bg-green-500/20 text-green-500' :
                            session?.status === 'rolling' ? 'bg-yellow-500/20 text-yellow-500' :
                                session?.status === 'revealed' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-gray-500/20 text-gray-500'
                        }`}>
                        {session?.status === 'betting' ? '🎯 Đang cược' :
                            session?.status === 'rolling' ? '🎲 Đang lắc' :
                                session?.status === 'revealed' ? '📊 Kết quả' :
                                    '⏳ Chờ...'}
                    </span>
                    {isHost && (
                        <span className="flex items-center gap-1 bg-primary/20 px-2 py-1 rounded-full text-xs text-primary font-medium">
                            <Crown className="w-3 h-3" />
                            Host
                        </span>
                    )}
                </div>
            </div>

            {/* Dice Bowl */}
            <div className="flex justify-center py-4 md:py-6">
                <DiceBowl
                    isShaking={isShaking}
                    results={session?.status === 'revealed' ? session.dice_results : null}
                    previousResults={[]}
                    pendingResults={session?.status === 'revealed' ? session.dice_results : null}
                    onBowlRevealed={handleBowlRevealed}
                    canReveal={canReveal}
                />
            </div>

            {/* Bet Selector */}
            {session?.status === 'betting' && (
                <div className="px-4 pb-4">
                    <BetSelector
                        amounts={BET_AMOUNTS}
                        selectedAmount={selectedBetAmount}
                        onSelect={setSelectedBetAmount}
                    />
                </div>
            )}

            {/* Animal Grid */}
            <div className="flex-1 px-4 pb-4">
                <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                    {ANIMALS.map((animal) => {
                        const currentBet = bets[animal.id];
                        const isWinner = session?.status === 'revealed' && winCounts[animal.id] > 0 && currentBet > 0;

                        return (
                            <AnimalCard
                                key={animal.id}
                                animal={animal}
                                isSelected={currentBet > 0}
                                betAmount={currentBet}
                                onClick={() => handleAnimalClick(animal.id)}
                                isWinner={isWinner}
                                winCount={winCounts[animal.id]}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-muted/95 backdrop-blur-sm p-4 border-t border-border">
                <div className="flex justify-center gap-4 max-w-lg mx-auto">
                    {session?.status === 'betting' && (
                        <>
                            <Button
                                variant="gameDanger"
                                size="lg"
                                onClick={handleClearBets}
                                disabled={totalBet === 0}
                                className="flex-1"
                            >
                                Xóa Cược
                            </Button>
                            {isHost && (
                                <Button
                                    variant="gameGold"
                                    size="lg"
                                    onClick={handleShake}
                                    className="flex-1"
                                >
                                    <Dice5 className="w-5 h-5 mr-2" />
                                    Lắc!
                                </Button>
                            )}
                        </>
                    )}

                    {session?.status === 'rolling' && (
                        <div className="flex-1 text-center py-3">
                            <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
                            <span className="text-muted-foreground">Đang lắc xúc xắc...</span>
                        </div>
                    )}

                    {session?.status === 'revealed' && isHost && (
                        <Button
                            variant="gameGold"
                            size="lg"
                            onClick={handleNewRound}
                            className="flex-1"
                        >
                            <RotateCcw className="w-5 h-5 mr-2" />
                            Vòng Mới
                        </Button>
                    )}

                    {session?.status === 'revealed' && !isHost && (
                        <div className="flex-1 text-center py-3">
                            <span className="text-muted-foreground">Chờ host bắt đầu vòng mới...</span>
                        </div>
                    )}
                </div>

                {totalBet > 0 && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                        Tổng cược: <span className="font-bold text-foreground">{formatMoney(totalBet)}</span>
                    </p>
                )}

                {lastWinnings !== null && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center text-lg font-bold mt-2 ${lastWinnings > 0 ? 'text-green-500' : lastWinnings < 0 ? 'text-red-500' : 'text-muted-foreground'
                            }`}
                    >
                        {lastWinnings > 0 ? `+${formatMoney(lastWinnings)}` :
                            lastWinnings < 0 ? `-${formatMoney(Math.abs(lastWinnings))}` :
                                'Hòa'}
                    </motion.p>
                )}
            </div>
        </div>
    );
};

export default OnlineGame;
