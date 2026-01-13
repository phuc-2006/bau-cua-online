import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { AnimalType, ANIMALS } from "@/lib/game";

interface DiceBowlProps {
  isShaking: boolean;
  results: AnimalType[] | null;
  previousResults: AnimalType[];
  pendingResults?: AnimalType[] | null;
  onBowlRevealed?: () => void;
  canReveal: boolean;
}

const DiceBowl = ({ isShaking, results, previousResults, pendingResults, onBowlRevealed, canReveal }: DiceBowlProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const constraintsRef = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const renderDiceFace = (animalId: AnimalType) => {
    const animal = ANIMALS.find(a => a.id === animalId);
    if (animal?.image) {
      return (
        <>
          <img
            src={animal.image}
            alt={animal.name}
            className="w-full h-full object-contain p-1 drop-shadow-sm"
            onDragStart={(e) => e.preventDefault()}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="text-3xl md:text-4xl hidden">{animal?.emoji || '❓'}</span>
        </>
      );
    }
    return <span className="text-3xl md:text-4xl">{animal?.emoji || '❓'}</span>;
  };

  // Get dice faces - use pending (hidden) results if available, otherwise previous
  const getDiceFace = (index: number): AnimalType => {
    if (pendingResults && pendingResults.length > 0) {
      return pendingResults[index % pendingResults.length];
    }
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

    // Reduced threshold to 20 for very easy reveal
    if (distance > 20) {
      // Keep the bowl at the dropped position - don't spring back
      setIsRevealed(true);
      setHasBeenDragged(true);
      // Call the callback to reveal results
      if (onBowlRevealed) {
        onBowlRevealed();
      }
    } else {
      // Spring back only if not dragged far enough
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  // Reset when new shake starts - use effect to prevent state update during render
  useEffect(() => {
    if (isShaking) {
      setIsRevealed(false);
      setHasBeenDragged(false);
      x.set(0);
      y.set(0);
    }
  }, [isShaking, x, y]);

  // Bowl is always visible - covers the plate at all times
  const showBowl = true;

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

      {/* Dice Container - Triangle arrangement - pointer-events-none so bowl can be dragged */}
      <div className="absolute flex flex-col items-center justify-center z-10 pointer-events-none">
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
          className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center mb-2 border-2 border-primary/30"
        >
          {results && (isRevealed || !showBowl) ? renderDiceFace(results[0]) : renderDiceFace(getDiceFace(0))}
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
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center border-2 border-primary/30"
          >
            {results && (isRevealed || !showBowl) ? renderDiceFace(results[1]) : renderDiceFace(getDiceFace(1))}
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
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center border-2 border-primary/30"
          >
            {results && (isRevealed || !showBowl) ? renderDiceFace(results[2]) : renderDiceFace(getDiceFace(2))}
          </motion.div>
        </div>
      </div>

      {/* Bowl Cover - Circular, covers entire plate, draggable, never invisible */}
      {showBowl && (
        <motion.div
          drag={canReveal && !hasBeenDragged}
          dragConstraints={hasBeenDragged ? undefined : constraintsRef}
          dragElastic={hasBeenDragged ? 0 : 0.5}
          onDragEnd={handleDragEnd}
          style={{
            x,
            y,
            background: 'radial-gradient(ellipse at 30% 20%, #B22222 0%, #8B0000 30%, #6B0000 60%, #4B0000 100%)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 -10px 30px rgba(0,0,0,0.4), inset 0 5px 20px rgba(255,255,255,0.1)',
          }}
          animate={isShaking ? {
            rotate: [0, -8, 8, -6, 6, -4, 4, 0],
            y: [0, -8, 8, -6, 6, -4, 4, 0],
            x: [0, 4, -4, 3, -3, 2, -2, 0],
          } : {}}
          transition={isShaking ? {
            duration: 0.25,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
          className={`absolute inset-0 z-20 w-72 h-72 md:w-80 md:h-80 m-auto rounded-full ${canReveal && !hasBeenDragged ? 'cursor-grab' : 'cursor-default'} active:cursor-grabbing`}
        >
          {/* Bowl dome effect */}
          <div
            className="absolute inset-4 rounded-full"
            style={{
              background: 'radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }}
          />

          {/* Cloud pattern decoration */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
            {/* Cloud 1 - top left */}
            <g fill="rgba(255,215,0,0.35)">
              <ellipse cx="80" cy="70" rx="20" ry="14" />
              <ellipse cx="95" cy="62" rx="16" ry="11" />
              <ellipse cx="102" cy="72" rx="14" ry="10" />
              <ellipse cx="65" cy="68" rx="14" ry="9" />
            </g>
            {/* Cloud 2 - right */}
            <g fill="rgba(255,215,0,0.3)">
              <ellipse cx="220" cy="120" rx="22" ry="15" />
              <ellipse cx="238" cy="112" rx="17" ry="12" />
              <ellipse cx="244" cy="123" rx="15" ry="10" />
              <ellipse cx="205" cy="118" rx="15" ry="10" />
            </g>
            {/* Cloud 3 - bottom */}
            <g fill="rgba(255,215,0,0.25)">
              <ellipse cx="130" cy="200" rx="24" ry="16" />
              <ellipse cx="150" cy="190" rx="18" ry="13" />
              <ellipse cx="158" cy="203" rx="16" ry="11" />
              <ellipse cx="112" cy="198" rx="16" ry="11" />
            </g>
            {/* Cloud 4 - center */}
            <g fill="rgba(255,215,0,0.2)">
              <ellipse cx="150" cy="130" rx="18" ry="12" />
              <ellipse cx="165" cy="124" rx="14" ry="10" />
              <ellipse cx="140" cy="126" rx="12" ry="8" />
            </g>
            {/* Decorative swirls */}
            <path d="M 60 180 Q 80 160 100 180 T 140 180" stroke="rgba(255,215,0,0.3)" strokeWidth="2.5" fill="none" />
            <path d="M 180 80 Q 200 60 220 80 T 260 80" stroke="rgba(255,215,0,0.25)" strokeWidth="2.5" fill="none" />
            <path d="M 200 200 Q 215 185 230 200" stroke="rgba(255,215,0,0.2)" strokeWidth="2" fill="none" />
          </svg>

          {/* Bowl rim/edge */}
          <div
            className="absolute inset-0 rounded-full border-8 border-primary/60"
            style={{
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
            }}
          />

          {/* Bowl handle/knob at top */}
          <div
            className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-10 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
          />

        </motion.div>
      )}
    </div>
  );
};

export default DiceBowl;
