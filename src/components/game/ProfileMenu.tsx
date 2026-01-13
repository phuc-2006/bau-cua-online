import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  Wallet,
  ChevronDown,
  Shield,
  Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/game";

interface ProfileMenuProps {
  username: string;
  balance: number;
  isAdmin: boolean;
  onLogout: () => void;
}

const ProfileMenu = ({ username, balance, isAdmin, onLogout }: ProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <Button
        variant="gameOutline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">{username}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl shadow-2xl border-2 border-primary/30 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="p-4 bg-primary/10 border-b border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-card-foreground">{username}</p>
                    <p className="text-sm text-primary font-medium">{formatMoney(balance)}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-card-foreground"
                >
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  <span>Trang chủ</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/deposit");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-card-foreground"
                >
                  <Wallet className="w-5 h-5 text-primary" />
                  <span>Nạp tiền</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/admin");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-card-foreground"
                  >
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <div className="border-t border-border my-2" />

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
