import { motion } from "framer-motion";

const stages = [
  { name: "Sailor", emoji: "🧑‍✈️" },
  { name: "Adventurer", emoji: "🗡️" },
  { name: "Captain", emoji: "🏴‍☠️" },
  { name: "Legend", emoji: "👑" },
];

export function PlayerCard({ level, pos }) {
  const stage = stages[Math.min(Math.floor(level / 10), stages.length - 1)];

  return (
    <motion.div
      className="p-4 bg-gray-900 rounded-xl shadow-xl flex flex-col items-center"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="text-5xl">{stage.emoji}</div>
      <h2 className="text-xl font-bold mt-2">{stage.name}</h2>
      <p>Level {level}</p>
      <p className="mt-1">Tile: {pos}</p>
    </motion.div>
  );
}
