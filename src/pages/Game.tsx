import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GameBoard from "@/components/game/GameBoard";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Game = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          navigate("/login");
          return;
        }
        setUser(session.user);
        
        // Fetch profile and role
        setTimeout(async () => {
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching profile:", error);
          } else if (profileData) {
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
        }, 500);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleBalanceChange = async (newBalance: number) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, balance: newBalance });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật số dư.",
        variant: "destructive",
      });
    }
  };

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
    <GameBoard
      balance={profile?.balance || 100000}
      onBalanceChange={handleBalanceChange}
      onLogout={handleLogout}
      username={profile?.username || "Người chơi"}
      isAdmin={isAdmin}
    />
  );
};

export default Game;
