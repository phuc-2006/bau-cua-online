import { formatMoney } from "@/lib/game";

interface BetSelectorProps {
  amounts: number[];
  selectedAmount: number;
  onSelect: (amount: number) => void;
}

const BetSelector = ({ amounts, selectedAmount, onSelect }: BetSelectorProps) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-foreground font-medium">Chọn mức cược:</span>
      <div className="flex flex-wrap justify-center gap-2">
        {amounts.map((amount) => (
          <button
            key={amount}
            onClick={() => onSelect(amount)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 border-2 ${
              selectedAmount === amount
                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                : 'bg-transparent text-foreground border-primary/60 hover:border-primary hover:bg-primary/10'
            }`}
          >
            {formatMoney(amount)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BetSelector;
