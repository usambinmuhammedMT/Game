import { useState } from "react";
import { motion } from "framer-motion";
import { ChallengeModal } from "./components/ChallengeModal";
import { PlayerCard } from "./components/PlayerCard";

const TOTAL_TILES = 42;

export default function App() {
  const [playerPos, setPlayerPos] = useState(1);
  const [showChallenge, setShowChallenge] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);

  const handleNext = () => {
    setShowChallenge(true);
  };

  const handleChallengeResult = (success) => {
    setShowChallenge(false);
    if (success) {
      const nextPos = playerPos + 1;
      setPlayerPos(nextPos);
      setPlayerLevel((lvl) => lvl + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-oceanBlue to-black flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-4xl font-bold text-pirateGold mb-4">
        🏴‍☠️ Lost Relics
      </h1>

      {/* Board */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {Array.from({ length: TOTAL_TILES }, (_, i) => {
          const tile = i + 1;
          const isActive = playerPos === tile;
          return (
            <motion.div
              key={tile}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 ${
                isActive ? "bg-pirateGold text-black" : "bg-gray-800"
              }`}
              animate={isActive ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6 }}
            >
              {tile}
            </motion.div>
          );
        })}
      </div>

      {/* Player Card */}
      <PlayerCard level={playerLevel} pos={playerPos} />

      {/* Next Step Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="mt-6 px-6 py-3 bg-pirateGold text-black font-bold rounded-xl shadow-lg"
        onClick={handleNext}
      >
        Attempt Next Level
      </motion.button>

      {/* Challenge Modal */}
      {showChallenge && (
        <ChallengeModal onResult={handleChallengeResult} />
      )}
    </div>
  );
}
