import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, LogIn, UserPlus } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        {/* Logo/Title */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.span 
              className="text-6xl"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎮
            </motion.span>
            <h1 className="text-4xl md:text-6xl font-black text-foreground game-title text-shadow-gold">
              TRÒ CHƠI
            </h1>
            <motion.span 
              className="text-6xl"
              animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              🎲
            </motion.span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-primary game-title">
            DÂN GIAN VIỆT NAM
          </h2>
        </motion.div>

        <p className="text-muted-foreground text-lg mb-2">
          Bộ sưu tập các trò chơi truyền thống
        </p>
        <p className="text-foreground/70 text-sm mb-8">
          Chơi vui - Tiền ảo - Không cờ bạc thật
        </p>

        {/* Game icons */}
        <motion.div 
          className="flex justify-center gap-4 mb-10 text-4xl flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {['🎲', '🦌', '🦀', '🦐', '🐟', '🐓', '🎃', '♟️', '🃏'].map((emoji, index) => (
            <motion.span
              key={index}
              animate={{ 
                y: [0, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                delay: index * 0.15
              }}
            >
              {emoji}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login">
            <Button variant="gameGold" size="xl" className="w-full sm:w-auto">
              <LogIn className="w-5 h-5 mr-2" />
              Đăng nhập
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="gameOutline" size="xl" className="w-full sm:w-auto">
              <UserPlus className="w-5 h-5 mr-2" />
              Đăng ký
            </Button>
          </Link>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-3 gap-4 text-center"
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
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-4 text-muted-foreground text-sm"
      >
        Chỉ dành cho mục đích giải trí
      </motion.footer>
    </div>
  );
};

export default Index;
