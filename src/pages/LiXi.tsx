import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LiXi = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-amber-900 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4">
                <Link to="/">
                    <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Trang chủ
                    </Button>
                </Link>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="text-8xl mb-4">🧧</div>
                    <h1 className="text-4xl md:text-5xl font-black text-yellow-400 mb-2 drop-shadow-lg">
                        Lì Xì May Mắn
                    </h1>
                    <p className="text-white/70 text-lg">
                        Chọn cách nhận lộc của bạn
                    </p>
                </motion.div>

                {/* Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
                    {/* Lucky Wheel */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Link to="/lixi/wheel">
                            <div className="group relative bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl p-8 shadow-2xl border-4 border-yellow-400/50 hover:border-yellow-300 transition-all hover:scale-105 cursor-pointer overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.3),transparent_50%)]"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mx-auto mb-4">
                                        <Sparkles className="w-10 h-10 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                        Quay Số May Mắn
                                    </h2>
                                    <p className="text-white/80 text-center text-sm">
                                        Quay vòng quay để nhận lì xì ngẫu nhiên
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Grid Envelopes */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Link to="/lixi/grid">
                            <div className="group relative bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 shadow-2xl border-4 border-red-400/50 hover:border-red-300 transition-all hover:scale-105 cursor-pointer overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_50%)]"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mx-auto mb-4">
                                        <Grid3X3 className="w-10 h-10 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                        Lật Lì Xì
                                    </h2>
                                    <p className="text-white/80 text-center text-sm">
                                        16 bao lì xì - lật để khám phá số tiền
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </div>

                {/* Decorations */}
                <div className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce">🏮</div>
                <div className="absolute top-20 right-10 text-5xl opacity-20 animate-bounce delay-300">🎊</div>
                <div className="absolute bottom-20 left-20 text-5xl opacity-20 animate-bounce delay-500">🎆</div>
                <div className="absolute bottom-10 right-20 text-6xl opacity-20 animate-bounce delay-700">🏮</div>
            </div>
        </div>
    );
};

export default LiXi;
