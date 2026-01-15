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
    Dice5,
    Users,
    Crown,
    RotateCcw,
    Check
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
    isReady?: boolean;
    totalBet?: number;
    balance?: number;
    lastWinnings?: number | null;
    betDetails?: Record<AnimalType, number>;
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

    // Ready system
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());

    // Game state
    const [selectedBetAmount, setSelectedBetAmount] = useState(BET_AMOUNTS[0]);
    const [bets, setBets] = useState<Record<AnimalType, number>>({
        nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
    });
    const [isShaking, setIsShaking] = useState(false);
    const [canReveal, setCanReveal] = useState(false);
    const [autoRevealed, setAutoRevealed] = useState(false);
    const [bowlKey, setBowlKey] = useState(0); // Force remount DiceBowl on new round
    const [winCounts, setWinCounts] = useState<Record<AnimalType, number>>({
        nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
    });
    const [lastWinnings, setLastWinnings] = useState<number | null>(null);

    const navigate = useNavigate();
    const { toast } = useToast();
    const hasRevealedRef = useRef(false);

    // Leave room tracking
    const hasLeftRef = useRef(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const fetchIdRef = useRef(0);

    const totalBet = Object.values(bets).reduce((sum, bet) => sum + bet, 0);

    // Idempotent leave function
    const leaveRoom = useCallback(async (userId: string, showToast = true) => {
        if (hasLeftRef.current || !roomId) return;
        hasLeftRef.current = true;

        try {
            await supabase
                .from("room_players")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", userId);

            if (showToast) {
                toast({
                    title: "Đã rời phòng",
                    description: "Bạn đã rời khỏi phòng chơi.",
                });
            }
        } catch (error) {
            console.error("Error leaving room:", error);
            hasLeftRef.current = false;
        }
    }, [roomId, toast]);

    // Handle leave room button click
    const handleLeaveRoom = async () => {
        if (!user?.id || isLeaving) return;

        setIsLeaving(true);
        await leaveRoom(user.id);
        navigate("/rooms");
    };

    // Count non-host players
    const nonHostPlayers = players.filter(p => !p.isHost);
    // Use players array directly for ready check (more reliable than separate Set)
    const readyPlayerCount = nonHostPlayers.filter(p => p.isReady).length;
    const allPlayersReady = nonHostPlayers.length === 0 || readyPlayerCount === nonHostPlayers.length;

    // Debug log
    console.log('[OnlineGame] Ready check:', {
        nonHostPlayers: nonHostPlayers.map(p => ({ username: p.username, odlUserId: p.odlUserId, isReady: p.isReady })),
        readyPlayerCount,
        allPlayersReady
    });

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
            }

            setLoading(false);
        };

        fetchData();
    }, [navigate, roomId]);

    // Fetch players helper with sequence guard
    const fetchPlayers = async () => {
        if (!roomId) return;

        const currentFetchId = ++fetchIdRef.current;

        const { data: playersData, error: playersError } = await supabase
            .from("room_players")
            .select("id, user_id, is_ready, total_bet, bet_details")
            .eq("room_id", roomId);

        console.log('[fetchPlayers] Raw data:', playersData, 'Error:', playersError);

        // Abort if newer fetch started
        if (currentFetchId !== fetchIdRef.current) return;

        if (playersData) {
            const userIds = playersData.map(p => p.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, username, balance")
                .in("user_id", userIds);

            // Abort if newer fetch started
            if (currentFetchId !== fetchIdRef.current) return;

            const profilesMap = new Map(
                (profilesData || []).map(p => [p.user_id, { username: p.username, balance: p.balance }])
            );

            const { data: roomData } = await supabase
                .from("rooms")
                .select("host_id")
                .eq("id", roomId)
                .maybeSingle();

            // Abort if newer fetch started
            if (currentFetchId !== fetchIdRef.current) return;

            // Build ready players set from database
            const newReadyPlayers = new Set<string>();
            playersData.forEach((p: any) => {
                console.log('[fetchPlayers] Player:', p.user_id, 'is_ready:', p.is_ready);
                if (p.is_ready) newReadyPlayers.add(p.user_id);
            });
            console.log('[fetchPlayers] Setting readyPlayers:', [...newReadyPlayers]);
            setReadyPlayers(newReadyPlayers);

            const formattedPlayers = playersData.map((p: any) => {
                const profileInfo = profilesMap.get(p.user_id);
                // Preserve lastWinnings from existing player state
                const existingPlayer = players.find(ep => ep.odlUserId === p.user_id);
                return {
                    id: p.id,
                    username: profileInfo?.username || "Người chơi ẩn danh",
                    isHost: p.user_id === roomData?.host_id,
                    odlUserId: p.user_id,
                    isReady: p.is_ready || false,
                    totalBet: p.total_bet || 0,
                    balance: profileInfo?.balance || 0,
                    lastWinnings: existingPlayer?.lastWinnings ?? null,
                    betDetails: p.bet_details || {}
                };
            });
            setPlayers(formattedPlayers);

            // Sync local isReady state with database for current user
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser?.id) {
                const myPlayerData = playersData.find((p: any) => p.user_id === currentUser.id);
                if (myPlayerData) {
                    setIsReady(myPlayerData.is_ready || false);
                }
            }
        }
    };

    // Realtime subscriptions - subscribe to room_id for new sessions + player join/leave
    useEffect(() => {
        if (!roomId) return;

        // Helper: remove player locally (no fetchPlayers call to prevent race condition)
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

        // Helper: add player locally (no fetchPlayers call)
        const addPlayerLocal = async (userId?: string, rowId?: string) => {
            if (!userId || !rowId) return;
            fetchIdRef.current += 1;

            // Avoid duplicates
            setPlayers(prev => {
                if (prev.some(p => p.id === rowId || p.odlUserId === userId)) return prev;
                return [...prev, { id: rowId, username: "Đang tải...", isHost: false, odlUserId: userId, isReady: false }];
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

        const channel = supabase
            .channel(`online-game-${roomId}`)
            // Listen for room changes (host transfer)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${roomId}`
                },
                async (payload) => {
                    const newRoom = payload.new as any;
                    console.log('[OnlineGame] Room updated:', newRoom);

                    // Get current user to avoid stale closure
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    const currentUserId = currentUser?.id;

                    // Update isHost state if host changed
                    if (newRoom.host_id && currentUserId) {
                        setRoom(newRoom);
                        const amIHost = newRoom.host_id === currentUserId;
                        setIsHost(amIHost);
                        console.log('[OnlineGame] Host transfer - amIHost:', amIHost, 'host_id:', newRoom.host_id, 'myId:', currentUserId);

                        // Update players isHost flag
                        setPlayers(prev => prev.map(p => ({
                            ...p,
                            isHost: p.odlUserId === newRoom.host_id
                        })));

                        // If current user became host, notify them
                        if (amIHost) {
                            toast({
                                title: "👑 Bạn là Host mới!",
                                description: "Bạn có thể tạo vòng mới và lắc xúc xắc.",
                            });
                        }
                    }
                }
            )
            // Listen for session changes (INSERT for new rounds, UPDATE for status)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newSession = payload.new as GameSession;
                        setSession(newSession);
                        setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
                        setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
                        setLastWinnings(null);
                        setIsShaking(false);
                        setCanReveal(false);
                        setAutoRevealed(false);
                        setIsReady(false);
                        setReadyPlayers(new Set());
                        hasRevealedRef.current = false;
                        setBowlKey(prev => prev + 1);
                        toast({
                            title: "Vòng mới!",
                            description: "Hãy đặt cược vào con vật bạn chọn.",
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const newSession = payload.new as GameSession;
                        setSession(newSession);

                        if (newSession.status === 'rolling') {
                            setIsShaking(true);
                            setCanReveal(false);
                            setAutoRevealed(false);
                            hasRevealedRef.current = false;
                        } else if (newSession.status === 'revealed' && newSession.dice_results) {
                            setIsShaking(false);
                            setCanReveal(true);
                            setAutoRevealed(true);
                        }
                    }
                }
            )
            // Player JOIN
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'room_players',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const row = payload.new as any;
                    void addPlayerLocal(row?.user_id, row?.id);
                }
            )
            // Player LEAVE (no filter, check room_id manually)
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
            // Ready status UPDATE (is_ready changed)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'room_players',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const row = payload.new as any;
                    console.log('[OnlineGame] Received UPDATE event:', payload);
                    console.log('[OnlineGame] Row data:', row);
                    console.log('[OnlineGame] is_ready:', row.is_ready, 'user_id:', row.user_id);

                    setReadyPlayers(prev => {
                        const newSet = new Set(prev);
                        if (row.is_ready) {
                            newSet.add(row.user_id);
                        } else {
                            newSet.delete(row.user_id);
                        }
                        console.log('[OnlineGame] Updated readyPlayers:', [...newSet]);
                        return newSet;
                    });
                    // Also update local player object with ready status, total bet, and bet details
                    setPlayers(prevPlayers => prevPlayers.map(p =>
                        p.odlUserId === row.user_id
                            ? {
                                ...p,
                                isReady: row.is_ready || false,
                                totalBet: row.total_bet || 0,
                                betDetails: row.bet_details || {}
                            }
                            : p
                    ));
                }
            )
            .subscribe((status) => {
                console.log('[OnlineGame] Subscription status:', status);
            });

        // Faster polling for reliable sync (every 3 seconds)
        const syncInterval = setInterval(async () => {
            fetchPlayers();

            // Also check if host changed (fallback for realtime)
            const { data: roomData } = await supabase
                .from("rooms")
                .select("host_id")
                .eq("id", roomId)
                .maybeSingle();

            if (roomData?.host_id) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser?.id) {
                    const amIHost = roomData.host_id === currentUser.id;
                    setIsHost(prev => {
                        if (prev !== amIHost) {
                            console.log('[Polling] Host changed, amIHost:', amIHost);
                            // Update players isHost flag
                            setPlayers(prevPlayers => prevPlayers.map(p => ({
                                ...p,
                                isHost: p.odlUserId === roomData.host_id
                            })));
                            if (amIHost && !prev) {
                                toast({
                                    title: "👑 Bạn là Host mới!",
                                    description: "Bạn có thể tạo vòng mới và lắc xúc xắc.",
                                });
                            }
                        }
                        return amIHost;
                    });
                }
            }
        }, 3000);

        return () => {
            clearInterval(syncInterval);
            supabase.removeChannel(channel);
        };
    }, [roomId, toast]);

    // Auto-reveal dice bowl when status is revealed
    useEffect(() => {
        if (autoRevealed && session?.status === 'revealed' && session.dice_results && !hasRevealedRef.current) {
            hasRevealedRef.current = true;
            // Small delay for smooth animation
            const timer = setTimeout(() => {
                handleDiceRevealed(session.dice_results as AnimalType[]);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [autoRevealed, session?.status, session?.dice_results]);

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

        // Update current player's lastWinnings in players array
        if (user?.id) {
            setPlayers(prev => prev.map(p =>
                p.odlUserId === user.id
                    ? { ...p, lastWinnings: netChange }
                    : p
            ));
        }

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

        const newBets = {
            ...bets,
            [animalId]: bets[animalId] + selectedBetAmount
        };
        setBets(newBets);

        // Sync total bet and bet details to database for display to other players
        const newTotalBet = Object.values(newBets).reduce((sum, bet) => sum + bet, 0);
        supabase
            .from("room_players")
            .update({ total_bet: newTotalBet, bet_details: newBets })
            .eq("room_id", roomId)
            .eq("user_id", user.id)
            .then();
    };

    // Clear bets
    const handleClearBets = () => {
        if (isShaking || session?.status !== 'betting') return;

        // Refund
        setProfile({ ...profile, balance: profile.balance + totalBet });
        setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });

        // Reset total bet and bet details in database
        if (user && roomId) {
            const emptyBets = { nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 };
            supabase
                .from("room_players")
                .update({ total_bet: 0, bet_details: emptyBets })
                .eq("room_id", roomId)
                .eq("user_id", user.id)
                .then();
        }
    };

    // Player ready toggle - saves to database for reliable sync
    // Works in both lobby (no session) and betting phase
    const handleToggleReady = async () => {
        if (isHost || !user || !roomId) return;
        // Only allow in lobby or betting phase
        if (session && session.status !== 'betting') return;

        const newIsReady = !isReady;

        // Optimistic update
        setIsReady(newIsReady);

        // Update in database (will trigger realtime UPDATE for all clients)
        const { error } = await supabase
            .from("room_players")
            .update({ is_ready: newIsReady })
            .eq("room_id", roomId)
            .eq("user_id", user.id);

        if (error) {
            // Revert optimistic update on error
            setIsReady(!newIsReady);
            toast({
                title: "Lỗi",
                description: "Không thể cập nhật trạng thái sẵn sàng.",
                variant: "destructive",
            });
            return;
        }

        console.log('[OnlineGame] Updated ready status in database:', { userId: user.id, isReady: newIsReady });

        toast({
            title: newIsReady ? "✅ Sẵn sàng!" : "⏸️ Hủy sẵn sàng",
            description: newIsReady ? "Bạn đã sẵn sàng để lắc." : "Bạn đã hủy trạng thái sẵn sàng.",
        });
    };

    // Host shake dice
    const handleShake = async () => {
        if (!isHost || !session) return;

        // Check if all players are ready (if there are other players)
        if (nonHostPlayers.length > 0 && !allPlayersReady) {
            toast({
                title: "Chưa thể lắc!",
                description: "Đợi tất cả người chơi sẵn sàng.",
                variant: "destructive",
            });
            return;
        }

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
            // Reset ready status, total bets and bet details in database (with error check)
            const emptyBets = { nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 };
            const { error: resetError } = await supabase
                .from("room_players")
                .update({ is_ready: false, total_bet: 0, bet_details: emptyBets })
                .eq("room_id", roomId);

            if (resetError) throw resetError;

            // Reset local state
            setReadyPlayers(new Set());
            setIsReady(false);

            // Create new session - other players will receive via realtime INSERT
            const { error } = await supabase
                .from("game_sessions")
                .insert({
                    room_id: roomId,
                    status: 'betting'
                });

            if (error) throw error;

            // Local state will be updated via realtime subscription

        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Không thể tạo vòng mới.",
                variant: "destructive",
            });
        }
    };

    // Start game (first session) - host only
    const handleStartGame = async () => {
        if (!isHost || !roomId) return;

        // Check if all players are ready
        if (nonHostPlayers.length > 0 && !allPlayersReady) {
            toast({
                title: "Chưa thể bắt đầu!",
                description: "Đợi tất cả người chơi sẵn sàng.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Reset ready status, total bets and bet details for game start (with error check)
            const emptyBets = { nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 };
            const { error: resetError } = await supabase
                .from("room_players")
                .update({ is_ready: false, total_bet: 0, bet_details: emptyBets })
                .eq("room_id", roomId);

            if (resetError) throw resetError;

            // Reset local state
            setReadyPlayers(new Set());
            setIsReady(false);

            // Create first game session
            const { error } = await supabase
                .from("game_sessions")
                .insert({
                    room_id: roomId,
                    status: 'betting'
                });

            if (error) throw error;

            toast({
                title: "🎲 Game bắt đầu!",
                description: "Hãy đặt cược vào con vật bạn chọn.",
            });

        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message || "Không thể bắt đầu game.",
                variant: "destructive",
            });
        }
    };

    const handleLogout = async () => {
        if (user?.id) {
            await leaveRoom(user.id, false);
        }
        await supabase.auth.signOut();
        navigate("/");
    };

    // Auto-leave on unmount
    useEffect(() => {
        return () => {
            if (!hasLeftRef.current && user?.id && roomId) {
                // Fire-and-forget leave on unmount
                supabase
                    .from("room_players")
                    .delete()
                    .eq("room_id", roomId)
                    .eq("user_id", user.id)
                    .then();
            }
        };
    }, [user?.id, roomId]);

    const handleBowlRevealed = () => {
        if (session?.dice_results && !hasRevealedRef.current) {
            hasRevealedRef.current = true;
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

    // Animal image mapping for bet display (using same images as betting cards)
    const animalImages: Record<AnimalType, string> = {
        nai: '/images/animals/nai.png',
        bau: '/images/animals/bau.png',
        ga: '/images/animals/ga.png',
        ca: '/images/animals/ca.png',
        cua: '/images/animals/cua.png',
        tom: '/images/animals/tom.png'
    };
    const animalName: Record<AnimalType, string> = {
        nai: 'Nai', bau: 'Bầu', ga: 'Gà', ca: 'Cá', cua: 'Cua', tom: 'Tôm'
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Sidebar - Players List */}
            <aside className="w-64 lg:w-72 border-r border-border flex-shrink-0 flex flex-col bg-muted/30">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="font-bold text-foreground">
                            Người chơi ({players.length}/{room?.max_players || 6})
                        </span>
                    </div>
                </div>

                {/* Players List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {players.map((player) => {
                        const isCurrentPlayer = player.odlUserId === user?.id;
                        const playerIsReady = readyPlayers.has(player.odlUserId);
                        const playerBetDetails = player.betDetails || {};
                        const hasBets = Object.values(playerBetDetails).some(v => (v as number) > 0);

                        return (
                            <div
                                key={player.id}
                                className={`rounded-xl border p-3 transition-all ${isCurrentPlayer
                                    ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30'
                                    : 'bg-background/50 border-border hover:bg-background/80'
                                    }`}
                            >
                                {/* Player Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {player.isHost && (
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                        )}
                                        <span className={`font-semibold ${isCurrentPlayer ? 'text-primary' : 'text-foreground'}`}>
                                            {player.username}
                                            {isCurrentPlayer && ' (Bạn)'}
                                        </span>
                                    </div>
                                    {/* Ready indicator */}
                                    {session?.status === 'betting' && !player.isHost && (
                                        <div className={`w-3 h-3 rounded-full ${playerIsReady ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                                    )}
                                </div>

                                {/* Balance & Total Bet */}
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Số dư:</span>
                                    <span className="font-medium text-foreground">{formatMoney(player.balance || 0)}</span>
                                </div>

                                {/* Total Bet */}
                                {(session?.status === 'betting' || session?.status === 'rolling') && (player.totalBet || 0) > 0 && (
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Tổng cược:</span>
                                        <span className="font-semibold text-orange-500">-{formatMoney(player.totalBet || 0)}</span>
                                    </div>
                                )}

                                {/* Win/Loss after revealed */}
                                {session?.status === 'revealed' && player.lastWinnings !== null && player.lastWinnings !== undefined && (
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Kết quả:</span>
                                        <span className={`font-bold ${player.lastWinnings > 0 ? 'text-green-500' : player.lastWinnings < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {player.lastWinnings > 0 ? `+${formatMoney(player.lastWinnings)}` :
                                                player.lastWinnings < 0 ? `-${formatMoney(Math.abs(player.lastWinnings))}` :
                                                    'Hòa'}
                                        </span>
                                    </div>
                                )}

                                {/* Detailed Bets */}
                                {(session?.status === 'betting' || session?.status === 'rolling') && hasBets && (
                                    <div className="mt-2 pt-2 border-t border-border/50">
                                        <div className="text-xs text-muted-foreground mb-1.5">Chi tiết cược:</div>
                                        <div className="grid grid-cols-2 gap-1">
                                            {Object.entries(playerBetDetails)
                                                .filter(([_, amount]) => (amount as number) > 0)
                                                .map(([animal, amount]) => (
                                                    <div key={animal} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <img
                                                                src={animalImages[animal as AnimalType]}
                                                                alt={animalName[animal as AnimalType]}
                                                                className="w-4 h-4 object-contain"
                                                            />
                                                            <span>{animalName[animal as AnimalType]}</span>
                                                        </div>
                                                        <span className="font-medium text-orange-500">{formatMoney(amount as number)}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
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
                        {/* Ready status indicator */}
                        {session?.status === 'betting' && nonHostPlayers.length > 0 && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${allPlayersReady ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'
                                }`}>
                                {readyPlayers.size}/{nonHostPlayers.length} sẵn sàng
                            </span>
                        )}
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


                {/* Dice Bowl - auto reveal in online mode */}
                <div className="flex justify-center py-4 md:py-6">
                    <DiceBowl
                        key={bowlKey}
                        isShaking={isShaking}
                        results={session?.status === 'revealed' ? session.dice_results : null}
                        previousResults={[]}
                        pendingResults={session?.status === 'revealed' ? session.dice_results : null}
                        onBowlRevealed={handleBowlRevealed}
                        canReveal={canReveal}
                        autoReveal={autoRevealed}
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
                        {/* Lobby mode - no session yet */}
                        {!session && (
                            <>
                                {/* Non-host: Ready button */}
                                {!isHost && (
                                    <Button
                                        variant={isReady ? "game" : "gameOutline"}
                                        size="lg"
                                        onClick={handleToggleReady}
                                        className="flex-1"
                                    >
                                        <Check className={`w-5 h-5 mr-2 ${isReady ? 'text-white' : ''}`} />
                                        {isReady ? "Đã sẵn sàng" : "Sẵn sàng"}
                                    </Button>
                                )}

                                {/* Host: Start game button */}
                                {isHost && (
                                    <Button
                                        variant="gameGold"
                                        size="lg"
                                        onClick={handleStartGame}
                                        disabled={nonHostPlayers.length > 0 && !allPlayersReady}
                                        className="flex-1"
                                    >
                                        <Dice5 className="w-5 h-5 mr-2" />
                                        {nonHostPlayers.length > 0 && !allPlayersReady
                                            ? `Chờ sẵn sàng (${readyPlayerCount}/${nonHostPlayers.length})`
                                            : "Bắt đầu Game"}
                                    </Button>
                                )}

                                {/* Waiting message for non-host when ready */}
                                {!isHost && isReady && (
                                    <div className="text-center text-sm text-muted-foreground">
                                        Chờ host bắt đầu game...
                                    </div>
                                )}
                            </>
                        )}

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

                                {/* Non-host: Ready button */}
                                {!isHost && (
                                    <Button
                                        variant={isReady ? "game" : "gameOutline"}
                                        size="lg"
                                        onClick={handleToggleReady}
                                        className="flex-1"
                                    >
                                        <Check className={`w-5 h-5 mr-2 ${isReady ? 'text-white' : ''}`} />
                                        {isReady ? "Đã sẵn sàng" : "Sẵn sàng"}
                                    </Button>
                                )}

                                {/* Host: Shake button */}
                                {isHost && (
                                    <Button
                                        variant="gameGold"
                                        size="lg"
                                        onClick={handleShake}
                                        disabled={nonHostPlayers.length > 0 && !allPlayersReady}
                                        className="flex-1"
                                    >
                                        <Dice5 className="w-5 h-5 mr-2" />
                                        {nonHostPlayers.length > 0 && !allPlayersReady
                                            ? `Chờ sẵn sàng (${readyPlayerCount}/${nonHostPlayers.length})`
                                            : "Lắc!"}
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
            </main>
        </div>
    );
};

export default OnlineGame;
