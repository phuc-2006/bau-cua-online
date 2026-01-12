import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Loader2, Lock } from "lucide-react";
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

const Games = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

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
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
        <h1 className="text-2xl font-black text-foreground game-title">
          🎮 Trò Chơi Dân Gian
        </h1>
        
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

      {/* Games Grid */}
      <div className="max-w-6xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">Chọn trò chơi</h2>
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
                <Link to={game.route}>
                  <div className="group relative bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30 hover:border-primary transition-all hover:scale-105 cursor-pointer">
                    <div className="text-6xl mb-4">{game.emoji}</div>
                    <h3 className="text-xl font-bold text-card-foreground mb-2">{game.name}</h3>
                    <p className="text-muted-foreground text-sm">{game.description}</p>
                    <div className="mt-4 inline-flex items-center text-primary font-medium text-sm">
                      Chơi ngay →
                    </div>
                  </div>
                </Link>
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
  );
};

export default Games;
