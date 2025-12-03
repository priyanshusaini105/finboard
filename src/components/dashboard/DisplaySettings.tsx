import { motion } from "framer-motion";
import { CreditCard, Table, TrendingUp } from "lucide-react";

interface DisplaySettingsProps {
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  displayMode: "card" | "table" | "chart";
  onDisplayModeChange: (mode: "card" | "table" | "chart") => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03 },
  }),
};

export function DisplaySettings({
  refreshInterval,
  onRefreshIntervalChange,
  displayMode,
  onDisplayModeChange,
}: DisplaySettingsProps) {
  return (
    <>
      {/* Refresh Interval */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={itemVariants}
      >
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
          Refresh Interval (seconds)
        </label>
        <input
          type="number"
          value={refreshInterval}
          onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
          min="10"
          className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </motion.div>

      {/* Display Mode */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={itemVariants}
      >
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
          Display Mode
        </label>
        <div className="flex space-x-2">
          <motion.button
            onClick={() => onDisplayModeChange("card")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              displayMode === "card"
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <CreditCard className="w-4 h-4" />
            <span>Card</span>
          </motion.button>
          <motion.button
            onClick={() => onDisplayModeChange("table")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              displayMode === "table"
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Table className="w-4 h-4" />
            <span>Table</span>
          </motion.button>
          <motion.button
            onClick={() => onDisplayModeChange("chart")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              displayMode === "chart"
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Chart</span>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
