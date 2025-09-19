import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";

export function ChallengeModal({ onResult }) {
  const handlePass = () => onResult(true);
  const handleFail = () => onResult(false);

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-xl p-6 w-96 shadow-2xl text-center">
          <motion.h2
            className="text-xl font-bold mb-4 text-pirateGold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            🗡️ New Challenge!
          </motion.h2>
          <p className="mb-4">
            Solve this puzzle (placeholder). If you pass, you move forward.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handlePass}
              className="px-4 py-2 bg-green-500 rounded-lg font-bold"
            >
              Pass
            </button>
            <button
              onClick={handleFail}
              className="px-4 py-2 bg-red-500 rounded-lg font-bold"
            >
              Fail
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
