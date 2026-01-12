import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Dice5, ArrowLeft, Wallet, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimalCard from "./AnimalCard";
import DiceBowl from "./DiceBowl";
import BetSelector from "./BetSelector";
import { ANIMALS, BET_AMOUNTS, AnimalType, Bet, formatMoney } from "@/lib/game";
import { useToast } from "@/hooks/use-toast";

interface GameBoardProps {
  balance: number;
  onBalanceChange: (newBalance: number) => void;
  onBack: () => void;
}

const GameBoard = ({ balance, onBalanceChange, onBack }: GameBoardProps) => {
  const [selectedBetAmount, setSelectedBetAmount] = useState(BET_AMOUNTS[0]);
  const [bets, setBets] = useState<Record<AnimalType, number>>({
    nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
  });
  const [isShaking, setIsShaking] = useState(false);
  const [results, setResults] = useState<AnimalType[] | null>(null);
  const [winCounts, setWinCounts] = useState<Record<AnimalType, number>>({
    nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
  });
  const [lastWinnings, setLastWinnings] = useState<number | null>(null);
  const { toast } = useToast();

  const totalBet = Object.values(bets).reduce((sum, bet) => sum + bet, 0);

  const handleAnimalClick = (animalId: AnimalType) => {
    if (isShaking) return;
    
    if (balance < selectedBetAmount + totalBet - bets[animalId]) {
      toast({
        title: "Không đủ tiền!",
        description: "Số dư của bạn không đủ để đặt cược thêm.",
        variant: "destructive",
      });
      return;
    }

    setBets(prev => ({
      ...prev,
      [animalId]: prev[animalId] + selectedBetAmount
    }));
    setResults(null);
    setLastWinnings(null);
    setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
  };

  const handleClearBets = () => {
    if (isShaking) return;
    setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
    setResults(null);
    setLastWinnings(null);
    setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
  };

  const handleShake = () => {
    if (isShaking || totalBet === 0) {
      if (totalBet === 0) {
        toast({
          title: "Chưa đặt cược!",
          description: "Vui lòng chọn ít nhất một con vật để đặt cược.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsShaking(true);
    setResults(null);
    setLastWinnings(null);
    setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });

    // Simulate dice roll after shake animation
    setTimeout(() => {
      const animalIds: AnimalType[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
      const diceResults: AnimalType[] = [
        animalIds[Math.floor(Math.random() * 6)],
        animalIds[Math.floor(Math.random() * 6)],
        animalIds[Math.floor(Math.random() * 6)],
      ];

      // Count occurrences
      const counts: Record<AnimalType, number> = { nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 };
      diceResults.forEach(r => counts[r]++);
      setWinCounts(counts);

      // Calculate winnings
      let winnings = 0;
      Object.entries(bets).forEach(([animal, betAmount]) => {
        if (betAmount > 0 && counts[animal as AnimalType] > 0) {
          winnings += betAmount * counts[animal as AnimalType] + betAmount;
        }
      });

      // Calculate new balance
      const netChange = winnings - totalBet;
      const newBalance = balance + netChange;
      
      setResults(diceResults);
      setIsShaking(false);
      setLastWinnings(netChange);
      onBalanceChange(newBalance);

      // Reset bets after showing results
      setTimeout(() => {
        setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
      }, 2000);

      // Show result toast
      if (netChange > 0) {
        toast({
          title: "🎉 Thắng!",
          description: `Bạn thắng ${formatMoney(netChange)}`,
        });
      } else if (netChange < 0) {
        toast({
          title: "😢 Thua rồi!",
          description: `Bạn thua ${formatMoney(Math.abs(netChange))}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "🤝 Hòa!",
          description: "Bạn không thắng không thua.",
        });
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="gameOutline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold shadow-lg">
            <Wallet className="w-5 h-5" />
            {formatMoney(balance)}
          </div>
          <div className="hidden md:flex items-center gap-2 bg-card text-card-foreground px-4 py-2 rounded-full font-medium border-2 border-primary">
            🟢 Online
          </div>
        </div>
      </header>

      {/* Game Title */}
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-black text-foreground game-title text-shadow-gold flex items-center justify-center gap-3">
          <span>🎲</span>
          Bầu Cua Tôm Cá
          <span>🎲</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Trò chơi dân gian Việt Nam</p>
      </div>

      {/* Dice Bowl */}
      <div className="flex justify-center py-6">
        <DiceBowl isShaking={isShaking} results={results} />
      </div>

      {/* Win/Loss indicator */}
      <AnimatePresence>
        {lastWinnings !== null && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center text-xl font-bold mb-4 ${
              lastWinnings > 0 ? 'text-green-400' : lastWinnings < 0 ? 'text-red-400' : 'text-foreground'
            }`}
          >
            {lastWinnings > 0 ? `+${formatMoney(lastWinnings)}` : lastWinnings < 0 ? formatMoney(lastWinnings) : 'Hòa'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Selector */}
      <div className="px-4 pb-4">
        <BetSelector
          amounts={BET_AMOUNTS}
          selectedAmount={selectedBetAmount}
          onSelect={setSelectedBetAmount}
        />
      </div>

      {/* Animal Grid */}
      <div className="flex-1 px-4 pb-4">
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {ANIMALS.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              isSelected={bets[animal.id] > 0}
              betAmount={bets[animal.id]}
              onClick={() => handleAnimalClick(animal.id)}
              isWinner={results !== null && winCounts[animal.id] > 0 && bets[animal.id] > 0}
              winCount={winCounts[animal.id]}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-muted/95 backdrop-blur-sm p-4 border-t border-border">
        <div className="flex justify-center gap-4 max-w-lg mx-auto">
          <Button
            variant="gameDanger"
            size="lg"
            onClick={handleClearBets}
            disabled={isShaking || totalBet === 0}
            className="flex-1"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Xóa Cược
          </Button>
          <Button
            variant="gameGold"
            size="lg"
            onClick={handleShake}
            disabled={isShaking || totalBet === 0}
            className="flex-1"
          >
            <Dice5 className="w-5 h-5 mr-2" />
            Lắc!
          </Button>
        </div>
        {totalBet > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Tổng cược: <span className="font-bold text-foreground">{formatMoney(totalBet)}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
