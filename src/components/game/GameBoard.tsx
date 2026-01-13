import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Trash2, Dice5, Wallet, Users, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimalCard from "./AnimalCard";
import DiceBowl from "./DiceBowl";
import BetSelector from "./BetSelector";
import ProfileMenu from "./ProfileMenu";
import { ANIMALS, BET_AMOUNTS, AnimalType, formatMoney } from "@/lib/game";
import { useToast } from "@/hooks/use-toast";

interface GameBoardProps {
  balance: number;
  onBalanceChange: (newBalance: number) => void;
  onLogout: () => void;
  username: string;
  isAdmin: boolean;
}

const GameBoard = ({ balance, onBalanceChange, onLogout, username, isAdmin }: GameBoardProps) => {
  const [selectedBetAmount, setSelectedBetAmount] = useState(BET_AMOUNTS[0]);
  const [bets, setBets] = useState<Record<AnimalType, number>>({
    nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
  });
  // Store the bets that were made when dice were revealed (for win/loss display)
  const [revealedBets, setRevealedBets] = useState<Record<AnimalType, number>>({
    nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
  });
  const [isShaking, setIsShaking] = useState(false);
  const [results, setResults] = useState<AnimalType[] | null>(null);
  const [previousResults, setPreviousResults] = useState<AnimalType[]>([]);
  const [canReveal, setCanReveal] = useState(false);
  const [winCounts, setWinCounts] = useState<Record<AnimalType, number>>({
    nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0
  });
  const [lastWinnings, setLastWinnings] = useState<number | null>(null);
  const [pendingResults, setPendingResults] = useState<AnimalType[] | null>(null);
  // Store total bet for revealed round
  const [revealedTotalBet, setRevealedTotalBet] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalBet = Object.values(bets).reduce((sum, bet) => sum + bet, 0);

  const handleAnimalClick = (animalId: AnimalType) => {
    if (isShaking || canReveal) return;

    // Check if user has enough balance (current balance check, not including already placed bets since they are deducted)
    if (balance < selectedBetAmount) {
      toast({
        title: "Không đủ tiền!",
        description: "Số dư của bạn không đủ để đặt cược thêm.",
        variant: "destructive",
      });
      return;
    }

    // Deduct money immediately
    onBalanceChange(balance - selectedBetAmount);

    setBets(prev => ({
      ...prev,
      [animalId]: prev[animalId] + selectedBetAmount
    }));
    setResults(null);
    setLastWinnings(null);
    setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
  };

  const handleClearBets = () => {
    if (isShaking || canReveal) return;

    // Refund all bets
    onBalanceChange(balance + totalBet);

    setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
    setResults(null);
    setLastWinnings(null);
    setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
  };

  const handleShake = () => {
    if (isShaking || totalBet === 0 || canReveal) {
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

    // Roll dice after shake animation
    setTimeout(() => {
      const animalIds: AnimalType[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
      const diceResults: AnimalType[] = [
        animalIds[Math.floor(Math.random() * 6)],
        animalIds[Math.floor(Math.random() * 6)],
        animalIds[Math.floor(Math.random() * 6)],
      ];

      setPendingResults(diceResults);
      setIsShaking(false);
      setCanReveal(true);
    }, 2000);
  };

  const handleBowlRevealed = () => {
    if (!pendingResults) return;

    // Store the current bets for display purposes before resetting
    setRevealedBets({ ...bets });
    setRevealedTotalBet(totalBet);

    setResults(pendingResults);
    setPreviousResults(pendingResults);
    setCanReveal(false);

    // Count occurrences of each animal in the dice results
    const counts: Record<AnimalType, number> = { nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 };
    pendingResults.forEach(r => counts[r]++);
    setWinCounts(counts);

    // Calculate winnings
    // Rule: Since money was deducted when betting, we now return (Stake + Profit) for winning bets
    // Example: Bet 10k on "bầu".
    // - Place bet: Balance - 10k.
    // - "Bầu" appears 1 time: Win 10k (stake) + 10k (profit) = 20k. New Balance = (Balance - 10k) + 20k = Balance + 10k.
    // - "Bầu" appears 2 times: Win 10k (stake) + 20k (profit) = 30k. New Balance = (Balance - 10k) + 30k = Balance + 20k.
    let winnings = 0;
    Object.entries(bets).forEach(([animal, betAmount]) => {
      const animalType = animal as AnimalType;
      const count = counts[animalType];
      if (betAmount > 0 && count > 0) {
        // Return stake + (stake * count)
        winnings += betAmount + (betAmount * count);
      }
    });

    // Calculate new balance
    // Since bets were already deducted, we just add the winnings
    const newBalance = balance + winnings;

    // Calculate net change for display (Winnings - Total Bet)
    // Example: Bet 100k, Win 150k (100k stake + 50k profit). Net = +50k.
    // Example: Bet 100k, Lose. Winnings 0. Net = -100k.
    const netChange = winnings - totalBet;

    setLastWinnings(netChange);
    onBalanceChange(newBalance);
    setPendingResults(null);

    // Reset bets immediately when bowl is opened
    setBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });

    // Clear the win display after 3 seconds
    setTimeout(() => {
      setRevealedBets({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
      setRevealedTotalBet(0);
      setLastWinnings(null);
      setWinCounts({ nai: 0, bau: 0, ga: 0, ca: 0, cua: 0, tom: 0 });
      setResults(null);
    }, 3000);

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
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden md:inline">Trang chủ</span>
            </Button>
          </Link>
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl md:text-2xl font-black text-foreground game-title">
              🎲 Bầu Cua
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/rooms">
            <Button variant="gameOutline" size="sm" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Chơi Online</span>
            </Button>
          </Link>
          <Link to="/deposit">
            <Button variant="game" size="sm" className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Nạp</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-full font-bold shadow-lg text-sm md:text-base">
            <Wallet className="w-4 h-4 md:w-5 md:h-5" />
            {formatMoney(balance)}
          </div>

          <ProfileMenu
            username={username}
            balance={balance}
            isAdmin={isAdmin}
            onLogout={onLogout}
          />
        </div>
      </header>

      {/* Dice Bowl */}
      <div className="flex justify-center py-4 md:py-6">
        <DiceBowl
          isShaking={isShaking}
          results={results}
          previousResults={previousResults}
          pendingResults={pendingResults}
          onBowlRevealed={handleBowlRevealed}
          canReveal={canReveal}
        />
      </div>


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
          {ANIMALS.map((animal) => {
            // Use current bets for display if no results yet, otherwise use revealed bets for win display
            const currentBet = bets[animal.id];
            const displayBet = results !== null ? revealedBets[animal.id] : currentBet;
            const isWinner = results !== null && winCounts[animal.id] > 0 && revealedBets[animal.id] > 0;

            return (
              <AnimalCard
                key={animal.id}
                animal={animal}
                isSelected={currentBet > 0 || displayBet > 0}
                betAmount={displayBet}
                onClick={() => handleAnimalClick(animal.id)}
                isWinner={isWinner}
                winCount={winCounts[animal.id]}
              />
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-muted/95 backdrop-blur-sm p-4 border-t border-border">
        <div className="flex justify-center gap-4 max-w-lg mx-auto">
          <Button
            variant="gameDanger"
            size="lg"
            onClick={handleClearBets}
            disabled={isShaking || totalBet === 0 || canReveal}
            className="flex-1"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Xóa Cược
          </Button>
          <Button
            variant="gameGold"
            size="lg"
            onClick={handleShake}
            disabled={isShaking || totalBet === 0 || canReveal}
            className="flex-1"
          >
            <Dice5 className="w-5 h-5 mr-2" />
            {isShaking ? "Đang lắc..." : canReveal ? "Kéo bát!" : "Lắc!"}
          </Button>
        </div>
        {
          (totalBet > 0 || revealedTotalBet > 0) && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Tổng cược: <span className="font-bold text-foreground">{formatMoney(results !== null ? revealedTotalBet : totalBet)}</span>
            </p>
          )
        }
      </div>
    </div>
  );
};

export default GameBoard;
