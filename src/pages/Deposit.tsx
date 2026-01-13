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
  Send,
  Loader2,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

interface DepositRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
}

const Deposit = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<DepositRequest[]>([]);
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

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Check admin status
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roleData);

      // Fetch deposit requests
      const { data: requestsData } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (requestsData) {
        setRequests(requestsData);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleSubmitRequest = async () => {
    if (!user || !amount) return;

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum < 10000) {
      toast({
        title: "Lỗi",
        description: "Số tiền tối thiểu là 10.000đ",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          amount: amountNum,
        });

      if (error) throw error;

      // If admin, auto-approve and add money directly
      if (isAdmin) {
        // Add money to balance directly
        const newBalance = (profile?.balance || 0) + amountNum;
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("user_id", user.id);

        setProfile({ ...profile, balance: newBalance });

        toast({
          title: "Nạp tiền thành công!",
          description: `Đã nạp ${formatMoney(amountNum)} vào tài khoản.`,
        });
      } else {
        toast({
          title: "Gửi yêu cầu thành công!",
          description: "Yêu cầu nạp tiền của bạn đang chờ admin duyệt.",
        });
      }

      setAmount("");

      // Refresh requests
      const { data: requestsData } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (requestsData) {
        setRequests(requestsData);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi yêu cầu.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Từ chối";
      default:
        return "Đang chờ";
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="gameOutline" onClick={() => navigate("/baucua")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold">
            <Wallet className="w-5 h-5" />
            {formatMoney(profile?.balance || 0)}
          </div>
        </div>

        {/* Request Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30 mb-6"
        >
          <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            Yêu cầu nạp tiền
          </h2>

          <p className="text-muted-foreground text-sm mb-4">
            Gửi yêu cầu nạp tiền và chờ admin duyệt. Tiền sẽ được cộng vào tài khoản sau khi được duyệt.
          </p>

          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Nhập số tiền (tối thiểu 10.000đ)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-background border-border text-foreground"
            />
            <Button
              variant="gameGold"
              onClick={handleSubmitRequest}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[50000, 100000, 500000, 1000000].map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className="px-3 py-1 text-sm bg-background text-foreground rounded-full border border-border hover:border-primary transition-colors"
              >
                {formatMoney(amt)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Request History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/30"
        >
          <h2 className="text-xl font-bold text-card-foreground mb-4">
            Lịch sử yêu cầu
          </h2>

          {requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Chưa có yêu cầu nào.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-background rounded-xl border border-border"
                >
                  <div>
                    <p className="font-bold text-primary">
                      {formatMoney(request.amount)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(request.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="text-sm font-medium text-card-foreground">
                      {getStatusText(request.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Deposit;
