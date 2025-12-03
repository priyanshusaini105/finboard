import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useHeaderManagement } from "../../hooks/useHeaderManagement";

interface HeaderInputProps {
  onHeaderChange?: (headers: Record<string, string>) => void;
  initialHeaders?: Record<string, string>;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03 },
  }),
};

export function HeaderInput({
  onHeaderChange,
  initialHeaders,
}: HeaderInputProps) {
  const {
    headers,
    newHeaderKey,
    setNewHeaderKey,
    newHeaderValue,
    setNewHeaderValue,
    addHeader,
    removeHeader,
    addQuickHeader,
    headerValueInputRef,
  } = useHeaderManagement({ initialHeaders });

  const handleAddHeader = () => {
    addHeader();
    onHeaderChange?.(headers);
  };

  const handleRemoveHeader = (key: string) => {
    removeHeader(key);
    onHeaderChange?.({ ...headers, [key]: undefined } as Record<string, string>);
  };

  return (
    <motion.div
      custom={3}
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
        Headers (Optional)
      </label>

      {/* Quick header buttons */}
      <div className="flex space-x-2 mb-3 flex-wrap gap-2">
        <motion.button
          type="button"
          onClick={() => addQuickHeader("api-key")}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          + X-Api-Key
        </motion.button>
        <motion.button
          type="button"
          onClick={() => addQuickHeader("bearer")}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          + Bearer Token
        </motion.button>
        <motion.button
          type="button"
          onClick={() => addQuickHeader("basic")}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          + Basic Auth
        </motion.button>
      </div>

      {/* Add new header */}
      <div className="flex space-x-2 mb-3">
        <input
          type="text"
          value={newHeaderKey}
          onChange={(e) => setNewHeaderKey(e.target.value)}
          placeholder="Header name (e.g., X-Api-Key)"
          className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />
        <input
          ref={headerValueInputRef}
          type="text"
          value={newHeaderValue}
          onChange={(e) => setNewHeaderValue(e.target.value)}
          placeholder="Header value"
          className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />
        <motion.button
          type="button"
          onClick={handleAddHeader}
          disabled={!newHeaderKey || !newHeaderValue}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Add
        </motion.button>
      </div>

      {/* Display existing headers */}
      {Object.keys(headers).length > 0 && (
        <div className="space-y-2">
          {Object.entries(headers).map(([key, value]) => (
            <motion.div
              key={key}
              className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded border border-slate-300 dark:border-slate-600"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className="flex-1">
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {key}:
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 ml-2">
                  {key.toLowerCase().includes("authorization") ||
                  key.toLowerCase().includes("key")
                    ? value.length > 6 ? value.substring(0, 6) + '*'.repeat(value.length - 6) : value
                    : value}
                </span>
              </div>
              <motion.button
                type="button"
                onClick={() => handleRemoveHeader(key)}
                className="text-red-400 hover:text-red-300 text-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
