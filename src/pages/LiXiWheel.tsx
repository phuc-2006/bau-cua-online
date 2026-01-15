import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/game";
import confetti from "canvas-confetti";

// Weighted amounts for the wheel
const WHEEL_AMOUNTS = [
    { value: 10000, weight: 35 },
    { value: 20000, weight: 25 },
    { value: 30000, weight: 20 },
    { value: 50000, weight: 12 },
    { value: 100000, weight: 8 },
];

const LiXiWheel = () => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [displayAmount, setDisplayAmount] = useState<number | null>(null);
    const [finalAmount, setFinalAmount] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Weighted random selection
    const getRandomAmount = () => {
        const totalWeight = WHEEL_AMOUNTS.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of WHEEL_AMOUNTS) {
            random -= item.weight;
            if (random <= 0) {
                return item.value;
            }
        }
        return WHEEL_AMOUNTS[0].value;
    };

    const handleSpin = () => {
        if (isSpinning) return;

        setIsSpinning(true);
        setShowResult(false);
        setFinalAmount(null);

        // Calculate final amount before spinning
        const result = getRandomAmount();

        // Spinning animation - rapid number changes
        let spinCount = 0;
        const maxSpins = 30;
        const spinDuration = 3000; // 3 seconds
        const intervalTime = spinDuration / maxSpins;

        intervalRef.current = setInterval(() => {
            const randomDisplay = WHEEL_AMOUNTS[Math.floor(Math.random() * WHEEL_AMOUNTS.length)].value;
            setDisplayAmount(randomDisplay);
            spinCount++;

            if (spinCount >= maxSpins) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                setDisplayAmount(result);
                setFinalAmount(result);
                setIsSpinning(false);
                setShowResult(true);

                // Confetti for big wins
                if (result >= 50000) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#FF6B6B', '#FF8C00']
                    });
                }
            }
        }, intervalTime);
    };

    const handleReset = () => {
        setDisplayAmount(null);
        setFinalAmount(null);
        setShowResult(false);
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-800 to-orange-900 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4">
                <Link to="/lixi">
                    <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                </Link>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-black text-yellow-400 mb-2 drop-shadow-lg">
                        🎰 Quay Số May Mắn
                    </h1>
                    <p className="text-white/70">
                        Nhấn quay để nhận lì xì
                    </p>
                </motion.div>

                {/* Slot Machine Display */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mb-8"
                >
                    <div className="bg-gradient-to-b from-red-800 to-red-900 rounded-3xl p-2 shadow-2xl border-4 border-yellow-500">
                        <div className="bg-black rounded-2xl p-8 min-w-[280px]">
                            <div className={`text-center ${isSpinning ? 'animate-pulse' : ''}`}>
                                <AnimatePresence mode="wait">
                                    {displayAmount ? (
                                        <motion.div
                                            key={displayAmount}
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: 20, opacity: 0 }}
                                            transition={{ duration: 0.1 }}
                                            className={`text-5xl md:text-6xl font-black ${showResult
                                                    ? finalAmount && finalAmount >= 50000
                                                        ? 'text-yellow-400'
                                                        : 'text-green-400'
                                                    : 'text-white'
                                                }`}
                                        >
                                            {formatMoney(displayAmount)}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-5xl md:text-6xl font-black text-white/30"
                                        >
                                            ???
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Decorative lights */}
                    <div className="absolute -top-2 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div className="absolute -top-2 right-1/4 w-3 h-3 bg-red-400 rounded-full animate-pulse delay-100"></div>
                    <div className="absolute -bottom-2 left-1/3 w-3 h-3 bg-green-400 rounded-full animate-pulse delay-200"></div>
                    <div className="absolute -bottom-2 right-1/3 w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-300"></div>
                </motion.div>

                {/* Result Message */}
                <AnimatePresence>
                    {showResult && finalAmount && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="mb-8 text-center"
                        >
                            <div className="text-2xl text-white mb-2">
                                🎉 Chúc mừng bạn nhận được
                            </div>
                            <div className={`text-4xl font-black ${finalAmount >= 100000 ? 'text-yellow-400' :
                                    finalAmount >= 50000 ? 'text-orange-400' :
                                        'text-green-400'
                                }`}>
                                {formatMoney(finalAmount)}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex gap-4">
                    {!showResult ? (
                        <Button
                            onClick={handleSpin}
                            disabled={isSpinning}
                            size="lg"
                            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-xl px-12 py-6 rounded-full shadow-lg"
                        >
                            {isSpinning ? "Đang quay..." : "🎰 QUAY"}
                        </Button>
                    ) : (
                        <div className="flex gap-4">
                            <Button
                                onClick={handleSpin}
                                size="lg"
                                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-lg px-8 py-6 rounded-full shadow-lg"
                            >
                                🎰 Quay tiếp
                            </Button>
                            <Button
                                onClick={handleReset}
                                size="lg"
                                variant="outline"
                                className="border-white/30 text-white hover:bg-white/10 font-bold text-lg px-8 py-6 rounded-full"
                            >
                                <RotateCcw className="w-5 h-5 mr-2" />
                                Làm mới
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiXiWheel;
