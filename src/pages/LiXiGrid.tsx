import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/game";
import confetti from "canvas-confetti";

// Fixed envelope amounts distribution
const ENVELOPE_AMOUNTS = [
    10000, 10000, 10000, 10000, 10000,  // 5 x 10k
    20000, 20000, 20000, 20000,          // 4 x 20k
    30000, 30000, 30000,                  // 3 x 30k
    60000, 60000,                          // 2 x 60k
    100000, 100000,                        // 2 x 100k
];

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

interface Envelope {
    id: number;
    amount: number;
    isFlipped: boolean;
}

const LiXiGrid = () => {
    const [envelopes, setEnvelopes] = useState<Envelope[]>(() =>
        shuffleArray(ENVELOPE_AMOUNTS).map((amount, index) => ({
            id: index,
            amount,
            isFlipped: false,
        }))
    );
    const [totalRevealed, setTotalRevealed] = useState(0);
    const [lastFlippedAmount, setLastFlippedAmount] = useState<number | null>(null);

    const allFlipped = envelopes.every(e => e.isFlipped);

    const handleFlip = useCallback((id: number) => {
        setEnvelopes(prev => {
            const envelope = prev.find(e => e.id === id);
            if (!envelope || envelope.isFlipped) return prev;

            // Update state
            const newEnvelopes = prev.map(e =>
                e.id === id ? { ...e, isFlipped: true } : e
            );

            // Update total
            setTotalRevealed(current => current + envelope.amount);
            setLastFlippedAmount(envelope.amount);

            // Confetti for big amounts
            if (envelope.amount >= 60000) {
                setTimeout(() => {
                    confetti({
                        particleCount: 50,
                        spread: 60,
                        origin: { y: 0.7 },
                        colors: ['#FFD700', '#FF6B6B', '#FF8C00']
                    });
                }, 300);
            }

            return newEnvelopes;
        });
    }, []);

    const handleReset = () => {
        setEnvelopes(
            shuffleArray(ENVELOPE_AMOUNTS).map((amount, index) => ({
                id: index,
                amount,
                isFlipped: false,
            }))
        );
        setTotalRevealed(0);
        setLastFlippedAmount(null);
    };

    const getAmountColor = (amount: number) => {
        if (amount >= 100000) return 'text-yellow-400';
        if (amount >= 60000) return 'text-orange-400';
        if (amount >= 30000) return 'text-green-400';
        return 'text-white';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-amber-900 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4">
                <Link to="/lixi">
                    <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                </Link>
                <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Chơi lại
                </Button>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center p-4 md:p-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                >
                    <h1 className="text-2xl md:text-3xl font-black text-yellow-400 mb-1 drop-shadow-lg">
                        🧧 Lật Lì Xì
                    </h1>
                    <p className="text-white/70 text-sm">
                        Chạm vào bao để mở và nhận lộc
                    </p>
                </motion.div>

                {/* Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/30 backdrop-blur rounded-2xl px-6 py-3 mb-6 flex items-center gap-6"
                >
                    <div className="text-center">
                        <div className="text-white/60 text-xs">Đã mở</div>
                        <div className="text-white font-bold">
                            {envelopes.filter(e => e.isFlipped).length}/16
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="text-center">
                        <div className="text-white/60 text-xs">Tổng nhận</div>
                        <div className="text-yellow-400 font-bold">
                            {formatMoney(totalRevealed)}
                        </div>
                    </div>
                </motion.div>

                {/* Last Flipped Amount */}
                <AnimatePresence>
                    {lastFlippedAmount && !allFlipped && (
                        <motion.div
                            key={lastFlippedAmount + Math.random()}
                            initial={{ opacity: 0, y: 20, scale: 0.5 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`mb-4 text-2xl font-bold ${getAmountColor(lastFlippedAmount)}`}
                        >
                            +{formatMoney(lastFlippedAmount)}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Envelope Grid */}
                <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-md mx-auto mb-6">
                    {envelopes.map((envelope, index) => (
                        <motion.div
                            key={envelope.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            className="perspective-1000"
                        >
                            <motion.div
                                onClick={() => handleFlip(envelope.id)}
                                className={`relative w-16 h-20 md:w-20 md:h-24 cursor-pointer transform-style-preserve-3d transition-transform duration-500 ${envelope.isFlipped ? 'rotate-y-180' : ''
                                    }`}
                                whileHover={!envelope.isFlipped ? { scale: 1.1 } : {}}
                                whileTap={!envelope.isFlipped ? { scale: 0.95 } : {}}
                                style={{
                                    transformStyle: 'preserve-3d',
                                    transform: envelope.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                }}
                            >
                                {/* Front - Envelope */}
                                <div
                                    className="absolute inset-0 backface-hidden bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-lg border-2 border-yellow-500/50 flex items-center justify-center"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <div className="text-3xl md:text-4xl">🧧</div>
                                </div>

                                {/* Back - Amount */}
                                <div
                                    className="absolute inset-0 backface-hidden bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl shadow-lg border-2 border-yellow-300 flex items-center justify-center"
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)'
                                    }}
                                >
                                    <div className={`text-xs md:text-sm font-bold text-red-800 text-center px-1`}>
                                        {formatMoney(envelope.amount)}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    ))}
                </div>

                {/* All Flipped Result */}
                <AnimatePresence>
                    {allFlipped && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur rounded-2xl p-6 border border-yellow-500/30"
                        >
                            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                            <div className="text-white text-lg mb-1">🎉 Hoàn thành!</div>
                            <div className="text-3xl font-black text-yellow-400">
                                Tổng: {formatMoney(totalRevealed)}
                            </div>
                            <Button
                                onClick={handleReset}
                                className="mt-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Chơi lại
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LiXiGrid;
