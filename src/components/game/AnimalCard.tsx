import { motion } from "framer-motion";
import { Animal, AnimalType } from "@/lib/game";

interface AnimalCardProps {
  animal: Animal;
  isSelected: boolean;
  betAmount: number;
  onClick: () => void;
  isWinner?: boolean;
  winCount?: number;
}

const AnimalCard = ({ animal, isSelected, betAmount, onClick, isWinner, winCount = 0 }: AnimalCardProps) => {
  return (
    <motion.button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-4 transition-all duration-200 ${isSelected
          ? 'border-primary bg-card shadow-lg ring-2 ring-primary/50'
          : 'border-primary/60 bg-card hover:border-primary hover:shadow-md'
        } ${isWinner ? 'ring-4 ring-green-500 animate-pulse-gold' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {animal.image ? (
        <img
          src={animal.image}
          alt={animal.name}
          className="w-20 h-20 md:w-24 md:h-24 object-contain mb-2 drop-shadow-md"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <span className={`text-5xl md:text-6xl mb-2 ${animal.image ? 'hidden' : ''}`}>{animal.emoji}</span>
      <span className="text-lg font-bold text-card-foreground">{animal.name}</span>

      {betAmount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg"
        >
          {new Intl.NumberFormat('vi-VN').format(betAmount)}đ
        </motion.div>
      )}

      {isWinner && winCount > 0 && (
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
        >
          x{winCount}
        </motion.div>
      )}
    </motion.button>
  );
};

export default AnimalCard;
