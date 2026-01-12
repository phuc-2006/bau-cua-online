import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Wallet, Lock, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/game";
import ProfileMenu from "@/components/game/ProfileMenu";

interface GameItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  available: boolean;
  route: string;
}

const GAMES: GameItem[] = [
  {
    id: "baucua",
    name: "Bầu Cua Tôm Cá",
    emoji: "🎲",
    description: "Trò chơi xúc xắc truyền thống với 6 linh vật may mắn",
    available: true,
    route: "/game"
  },
  {
    id: "ochemchem",
    name: "Ô Ăn Quan",
    emoji: "🕳️",
    description: "Trò chơi dân gian tính toán chiến thuật",
    available: false,
    route: "/o-an-quan"
  },
  {
    id: "cotu",
    name: "Cờ Tướng",
    emoji: "♟️",
    description: "Cờ tướng Việt Nam - đấu trí chiến thuật",
    available: false,
    route: "/co-tuong"
  },
  {
    id: "damcuoi",
    name: "Đánh Bài Tiến Lên",
    emoji: "🃏",
    description: "Trò chơi bài phổ biến nhất Việt Nam",
    available: false,
    route: "/tien-len"
  },
  {
    id: "caro",
    name: "Cờ Caro",
    emoji: "⭕",
    description: "5 quân liên tiếp để chiến thắng",
    available: false,
    route: "/caro"
  },
  {
    id: "xocdia",
    name: "Xóc Đĩa",
    emoji: "🔴",
    description: "Trò chơi may rủi truyền thống",
    available: false,
    route: "/xoc-dia"
  },
];

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
        }

        // Check if admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!roleData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <h1 className="text-xl md:text-2xl font-black text-foreground game-title">
          🎮 Trò Chơi Dân Gian
        </h1>

        <div className="flex items-center gap-3">
          {user ? (
            <>
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
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="gameGold" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="gameOutline" size="sm" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Đăng ký</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center py-8 md:py-12 px-4"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.span
              className="text-4xl md:text-6xl"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎮
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-black text-foreground game-title text-shadow-gold">
              TRÒ CHƠI
            </h2>
            <motion.span
              className="text-4xl md:text-6xl"
              animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              🎲
            </motion.span>
          </div>
          <h3 className="text-2xl md:text-4xl font-bold text-primary game-title">
            DÂN GIAN VIỆT NAM
          </h3>
        </motion.div>

        <p className="text-muted-foreground text-lg mt-4 mb-2">
          Bộ sưu tập các trò chơi truyền thống
        </p>
        <p className="text-foreground/70 text-sm">
          Chơi vui - Tiền ảo - Không cờ bạc thật
        </p>
      </motion.div>

      {/* Games Grid */}
      <div className="relative z-10 flex-1 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">Chọn trò chơi</h2>
            <p className="text-muted-foreground">Khám phá các trò chơi dân gian Việt Nam</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {GAMES.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {game.available ? (
                  <div className="group relative bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30 hover:border-primary transition-all">
                    <div className="text-6xl mb-4">{game.emoji}</div>
                    <h3 className="text-xl font-bold text-card-foreground mb-2">{game.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{game.description}</p>

                    <div className="flex gap-2">
                      <Link to={user ? game.route : "/login"} className="flex-1">
                        <Button variant="gameGold" size="sm" className="w-full">
                          {user ? "Chơi Solo" : "Đăng nhập"}
                        </Button>
                      </Link>
                      {game.id === "baucua" && (
                        <Link to={user ? "/rooms" : "/login"} className="flex-1">
                          <Button variant="gameOutline" size="sm" className="w-full">
                            <Users className="w-4 h-4 mr-1" />
                            Online
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-card/50 rounded-2xl p-6 shadow-xl border-2 border-border opacity-60">
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        Coming Soon
                      </div>
                    </div>
                    <div className="text-6xl mb-4 grayscale">{game.emoji}</div>
                    <h3 className="text-xl font-bold text-card-foreground mb-2">{game.name}</h3>
                    <p className="text-muted-foreground text-sm">{game.description}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 grid grid-cols-3 gap-4 text-center max-w-lg mx-auto pb-8 px-4"
      >
        <div className="p-4">
          <div className="text-3xl mb-2">🎮</div>
          <p className="text-foreground/80 text-sm font-medium">Nhiều trò chơi</p>
        </div>
        <div className="p-4">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-foreground/80 text-sm font-medium">Tiền ảo 100%</p>
        </div>
        <div className="p-4">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-foreground/80 text-sm font-medium">Xếp hạng</p>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 text-center text-muted-foreground text-sm py-4 border-t border-border"
      >
        Chỉ dành cho mục đích giải trí
      </motion.footer>
    </div>
  );
};

export default Index;
