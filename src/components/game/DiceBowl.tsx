import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { AnimalType, ANIMALS } from "@/lib/game";

interface DiceBowlProps {
  isShaking: boolean;
  results: AnimalType[] | null;
  previousResults: AnimalType[];
  onBowlRevealed?: () => void;
  canReveal: boolean;
}

const DiceBowl = ({ isShaking, results, previousResults, onBowlRevealed, canReveal }: DiceBowlProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const constraintsRef = useRef(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const bowlOpacity = useTransform(
    [x, y],
    ([latestX, latestY]: number[]) => {
      const distance = Math.sqrt(latestX * latestX + latestY * latestY);
      return Math.max(0, 1 - distance / 150);
    }
  );

  const getAnimalEmoji = (animalId: AnimalType) => {
    return ANIMALS.find(a => a.id === animalId)?.emoji || '❓';
  };

  // Get dice faces - use previous results or random if first game
  const getDiceFace = (index: number): AnimalType => {
    if (previousResults.length > 0) {
      return previousResults[index % previousResults.length];
    }
    const animalIds: AnimalType[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
    return animalIds[Math.floor(Math.random() * 6)];
  };

  const handleDragEnd = () => {
    if (!canReveal || hasBeenDragged) return;
    
    const currentX = x.get();
    const currentY = y.get();
    const distance = Math.sqrt(currentX * currentX + currentY * currentY);
    
    if (distance > 80) {
      setIsRevealed(true);
      setHasBeenDragged(true);
      onBowlRevealed?.();
    } else {
      // Spring back
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  // Reset when new shake starts
  if (isShaking && isRevealed) {
    setIsRevealed(false);
    setHasBeenDragged(false);
    x.set(0);
    y.set(0);
  }

  const showBowl = !isRevealed && (isShaking || canReveal);

  return (
    <div ref={constraintsRef} className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
      {/* Plate/Dish */}
      <div 
        className="absolute w-72 h-72 md:w-80 md:h-80 rounded-full shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #f5f5f5 0%, #e0e0e0 50%, #d0d0d0 100%)',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Inner plate circle */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-b from-gray-100 to-gray-200" />
        
        {/* Plate decorative border */}
        <div 
          className="absolute inset-2 rounded-full border-4 border-primary/20"
          style={{
            borderStyle: 'dashed',
          }}
        />
      </div>

      {/* Dice Container - Triangle arrangement */}
      <div className="absolute flex flex-col items-center justify-center z-10">
        {/* Top dice */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: (results && isRevealed) || (!showBowl && results) ? 1 : 0.8, 
            opacity: (results && isRevealed) || (!showBowl && results) ? 1 : (isShaking ? 0.3 : 0.6),
            rotate: isShaking ? [0, 15, -15, 10, -10, 0] : 0,
          }}
          transition={{ 
            duration: isShaking ? 0.3 : 0.5,
            repeat: isShaking ? Infinity : 0,
            type: "spring",
            stiffness: 200
          }}
          className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center text-3xl md:text-4xl mb-2 border-2 border-primary/30"
        >
          {results && (isRevealed || !showBowl) ? getAnimalEmoji(results[0]) : getAnimalEmoji(getDiceFace(0))}
        </motion.div>
        
        {/* Bottom two dice */}
        <div className="flex gap-3">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: (results && isRevealed) || (!showBowl && results) ? 1 : 0.8, 
              opacity: (results && isRevealed) || (!showBowl && results) ? 1 : (isShaking ? 0.3 : 0.6),
              rotate: isShaking ? [0, -15, 15, -10, 10, 0] : 0,
            }}
            transition={{ 
              duration: isShaking ? 0.3 : 0.5,
              delay: isShaking ? 0.05 : 0.1,
              repeat: isShaking ? Infinity : 0,
              type: "spring",
              stiffness: 200
            }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center text-3xl md:text-4xl border-2 border-primary/30"
          >
            {results && (isRevealed || !showBowl) ? getAnimalEmoji(results[1]) : getAnimalEmoji(getDiceFace(1))}
          </motion.div>
          
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: (results && isRevealed) || (!showBowl && results) ? 1 : 0.8, 
              opacity: (results && isRevealed) || (!showBowl && results) ? 1 : (isShaking ? 0.3 : 0.6),
              rotate: isShaking ? [0, 10, -10, 15, -15, 0] : 0,
            }}
            transition={{ 
              duration: isShaking ? 0.3 : 0.5,
              delay: isShaking ? 0.1 : 0.2,
              repeat: isShaking ? Infinity : 0,
              type: "spring",
              stiffness: 200
            }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center text-3xl md:text-4xl border-2 border-primary/30"
          >
            {results && (isRevealed || !showBowl) ? getAnimalEmoji(results[2]) : getAnimalEmoji(getDiceFace(2))}
          </motion.div>
        </div>
      </div>

      {/* Bowl Cover with Cloud Pattern - Draggable */}
      {showBowl && (
        <motion.div
          drag={canReveal && !hasBeenDragged}
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ 
            x, 
            y, 
            opacity: canReveal ? bowlOpacity : 1,
            background: 'linear-gradient(180deg, #8B0000 0%, #6B0000 50%, #4B0000 100%)',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4), inset 0 -5px 20px rgba(0,0,0,0.3)',
            top: '20%',
          }}
          animate={isShaking ? {
            rotate: [0, -5, 5, -5, 5, 0],
            y: [0, -5, 5, -3, 3, 0],
          } : {}}
          transition={isShaking ? {
            duration: 0.2,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
          className={`absolute z-20 w-56 h-40 md:w-64 md:h-44 rounded-t-full ${canReveal && !hasBeenDragged ? 'cursor-grab' : 'cursor-default'} active:cursor-grabbing`}
        >
          {/* Cloud pattern decoration */}
          <svg className="absolute inset-0 w-full h-full overflow-hidden" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
            {/* Cloud 1 */}
            <g fill="rgba(255,215,0,0.3)">
              <ellipse cx="40" cy="30" rx="15" ry="10" />
              <ellipse cx="50" cy="25" rx="12" ry="8" />
              <ellipse cx="55" cy="32" rx="10" ry="7" />
              <ellipse cx="30" cy="28" rx="10" ry="6" />
            </g>
            {/* Cloud 2 */}
            <g fill="rgba(255,215,0,0.25)">
              <ellipse cx="140" cy="50" rx="18" ry="12" />
              <ellipse cx="155" cy="45" rx="14" ry="9" />
              <ellipse cx="160" cy="53" rx="12" ry="8" />
              <ellipse cx="128" cy="48" rx="12" ry="7" />
            </g>
            {/* Cloud 3 */}
            <g fill="rgba(255,215,0,0.2)">
              <ellipse cx="80" cy="70" rx="16" ry="10" />
              <ellipse cx="92" cy="65" rx="13" ry="8" />
              <ellipse cx="96" cy="72" rx="11" ry="7" />
              <ellipse cx="68" cy="68" rx="11" ry="6" />
            </g>
            {/* Swirl patterns */}
            <path d="M 30 80 Q 40 70 50 80 T 70 80" stroke="rgba(255,215,0,0.3)" strokeWidth="2" fill="none" />
            <path d="M 120 30 Q 130 20 140 30 T 160 30" stroke="rgba(255,215,0,0.25)" strokeWidth="2" fill="none" />
          </svg>
          
          {/* Bowl rim */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-primary/80 to-primary"
            style={{
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
            }}
          />
          
          {/* Bowl handle/knob */}
          <div 
            className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-6 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #FFD700 0%, #B8860B 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          />
          
          {/* Drag hint */}
          {canReveal && !hasBeenDragged && (
            <motion.div
              animate={{ y: [0, 5, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-primary-foreground/80 text-sm font-medium whitespace-nowrap"
            >
              👆 Kéo bát để xem kết quả
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default DiceBowl;
