import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/game";
import {
  ArrowLeft,
  Wallet,
  Users,
  Check,
  X,
  Plus,
  Loader2,
  Shield,
  Clock,
  Search
} from "lucide-react";

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface Profile {
  id: string;
  user_id: string;
  username: string;
  balance: number;
}

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [addAmount, setAddAmount] = useState("");
  const [userAddAmounts, setUserAddAmounts] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"self" | "requests" | "users">("self");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        toast({
          title: "Không có quyền truy cập",
          description: "Bạn không phải là admin.",
          variant: "destructive",
        });
        navigate("/baucua");
        return;
      }

      setIsAdmin(true);

      // Fetch admin's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch all users
      await fetchAllUsers();

      // Fetch pending deposit requests
      await fetchDepositRequests();

      setLoading(false);
    };

    checkAdminStatus();
  }, [navigate, toast]);

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("username", { ascending: true });

    if (!error && data) {
      setAllUsers(data);
    }
  };

  const fetchDepositRequests = async () => {
    const { data, error } = await supabase
      .from("deposit_requests")
      .select(`
        *,
        profiles:user_id (
          username
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDepositRequests(data as any);
    }
  };

  const handleAddMoney = async () => {
    if (!profile || !addAmount) return;

    const amount = parseInt(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền hợp lệ.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ balance: profile.balance + amount })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, balance: profile.balance + amount });
      setAddAmount("");
      toast({
        title: "Thành công!",
        description: `Đã nạp ${formatMoney(amount)} vào tài khoản.`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể nạp tiền.",
        variant: "destructive",
      });
    }
  };

  const handleAddMoneyToUser = async (targetUser: Profile) => {
    const amountStr = userAddAmounts[targetUser.user_id];
    if (!amountStr) return;

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền hợp lệ.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(targetUser.user_id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ balance: targetUser.balance + amount })
        .eq("user_id", targetUser.user_id);

      if (error) throw error;

      // Update local state
      setAllUsers(prev => prev.map(u =>
        u.user_id === targetUser.user_id
          ? { ...u, balance: u.balance + amount }
          : u
      ));
      setUserAddAmounts(prev => ({ ...prev, [targetUser.user_id]: "" }));

      toast({
        title: "Thành công!",
        description: `Đã nạp ${formatMoney(amount)} cho ${targetUser.username}.`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể nạp tiền.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveRequest = async (request: DepositRequest) => {
    setProcessingId(request.id);

    try {
      // Get user's current balance
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", request.user_id)
        .maybeSingle();

      if (profileError || !userProfile) throw new Error("Không tìm thấy người dùng");

      // Update user's balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: userProfile.balance + request.amount })
        .eq("user_id", request.user_id);

      if (updateError) throw updateError;

      // Update request status
      const { error: requestError } = await supabase
        .from("deposit_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      toast({
        title: "Đã duyệt!",
        description: `Đã nạp ${formatMoney(request.amount)} cho người dùng.`,
      });

      await fetchDepositRequests();
      await fetchAllUsers();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể duyệt yêu cầu.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (request: DepositRequest) => {
    setProcessingId(request.id);

    try {
      const { error } = await supabase
        .from("deposit_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Đã từ chối",
        description: "Yêu cầu nạp tiền đã bị từ chối.",
      });

      await fetchDepositRequests();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể từ chối yêu cầu.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="gameOutline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Trang chủ
          </Button>
          <div className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold">Admin Dashboard</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "self" ? "game" : "gameOutline"}
            onClick={() => setActiveTab("self")}
          >
            <Wallet className="w-4 h-4 mr-2" />
            Tài khoản
          </Button>
          <Button
            variant={activeTab === "requests" ? "game" : "gameOutline"}
            onClick={() => setActiveTab("requests")}
          >
            <Clock className="w-4 h-4 mr-2" />
            Yêu cầu ({depositRequests.length})
          </Button>
          <Button
            variant={activeTab === "users" ? "game" : "gameOutline"}
            onClick={() => setActiveTab("users")}
          >
            <Users className="w-4 h-4 mr-2" />
            Quản lý Users
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "self" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30"
          >
            <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              Số dư của bạn
            </h2>
            <p className="text-3xl font-black text-primary mb-4">
              {formatMoney(profile?.balance || 0)}
            </p>

            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="Nhập số tiền..."
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="flex-1 bg-background border-border text-foreground"
              />
              <Button variant="gameGold" onClick={handleAddMoney}>
                <Plus className="w-4 h-4 mr-2" />
                Nạp tiền
              </Button>
            </div>
          </motion.div>
        )}

        {activeTab === "requests" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30"
          >
            <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Yêu cầu nạp tiền ({depositRequests.length})
            </h2>

            {depositRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Không có yêu cầu nào đang chờ duyệt.
              </p>
            ) : (
              <div className="space-y-4">
                {depositRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-background rounded-xl border border-border"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {(request as any).profiles?.username || "Người dùng"}
                      </p>
                      <p className="text-primary font-bold text-lg">
                        {formatMoney(request.amount)}
                      </p>
                      <p className="text-muted-foreground text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(request.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="gameGold"
                        size="sm"
                        onClick={() => handleApproveRequest(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="gameDanger"
                        size="sm"
                        onClick={() => handleRejectRequest(request)}
                        disabled={processingId === request.id}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30"
          >
            <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Quản lý Users ({allUsers.length})
            </h2>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUsers.map((userItem) => (
                <div
                  key={userItem.id}
                  className="flex items-center justify-between p-4 bg-background rounded-xl border border-border"
                >
                  <div>
                    <p className="font-bold text-foreground">{userItem.username}</p>
                    <p className="text-primary font-medium">
                      {formatMoney(userItem.balance)}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Số tiền"
                      value={userAddAmounts[userItem.user_id] || ""}
                      onChange={(e) => setUserAddAmounts(prev => ({
                        ...prev,
                        [userItem.user_id]: e.target.value
                      }))}
                      className="w-32 bg-card border-border text-foreground"
                    />
                    <Button
                      variant="gameGold"
                      size="sm"
                      onClick={() => handleAddMoneyToUser(userItem)}
                      disabled={processingId === userItem.user_id}
                    >
                      {processingId === userItem.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
