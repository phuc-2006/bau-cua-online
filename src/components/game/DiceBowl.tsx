import { motion } from "framer-motion";
import { AnimalType, ANIMALS } from "@/lib/game";

interface DiceBowlProps {
  isShaking: boolean;
  results: AnimalType[] | null;
}

const DiceBowl = ({ isShaking, results }: DiceBowlProps) => {
  const getAnimalEmoji = (animalId: AnimalType) => {
    return ANIMALS.find(a => a.id === animalId)?.emoji || '❓';
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Bowl container */}
      <motion.div
        className={`relative w-48 h-48 md:w-64 md:h-64 bg-card rounded-full shadow-2xl flex items-center justify-center ${
          isShaking ? 'animate-shake' : ''
        }`}
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)',
        }}
      >
        {/* Inner shadow effect */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-b from-gray-200/50 to-transparent" />
        
        {/* Dice results or placeholders */}
        <div className="relative flex items-center justify-center gap-2">
          {isShaking ? (
            // Shaking animation - show question marks
            <>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 5, 0] }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="text-3xl md:text-4xl"
              >
                🎲
              </motion.div>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0], y: [0, 5, -5, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, delay: 0.1 }}
                className="text-3xl md:text-4xl"
              >
                🎲
              </motion.div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 5, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, delay: 0.05 }}
                className="text-3xl md:text-4xl"
              >
                🎲
              </motion.div>
            </>
          ) : results ? (
            // Show results
            results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.2, type: "spring", stiffness: 200 }}
                className="text-4xl md:text-5xl"
              >
                {getAnimalEmoji(result)}
              </motion.div>
            ))
          ) : (
            // Empty state
            <div className="flex gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gray-200/60" />
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gray-200/60" />
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gray-200/60" />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DiceBowl;
