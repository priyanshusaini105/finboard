import { motion } from "framer-motion";
import { X, Edit2, Check, X as Cancel } from "lucide-react";
import { useEffect } from "react";
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
    startEditingHeader,
    cancelEditingHeader,
    saveEditingHeader,
    editingHeader,
    editingKey,
    setEditingKey,
    editingValue,
    setEditingValue,
    addQuickHeader,
    headerValueInputRef,
  } = useHeaderManagement({ initialHeaders });

  // Sync headers with parent whenever they change
  useEffect(() => {
    onHeaderChange?.(headers);
  }, [headers, onHeaderChange]);

  const handleAddHeader = () => {
    addHeader();
  };

  const handleRemoveHeader = (key: string) => {
    removeHeader(key);
  };

  const handleStartEditing = (key: string) => {
    startEditingHeader(key);
  };

  const handleCancelEditing = () => {
    cancelEditingHeader();
  };

  const handleSaveEditing = () => {
    saveEditingHeader();
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
              className="bg-slate-100 dark:bg-slate-700 p-2 rounded border border-slate-300 dark:border-slate-600"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              {editingHeader === key ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={editingKey}
                    onChange={(e) => setEditingKey(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-2 py-1 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-2 py-1 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <motion.button
                    type="button"
                    onClick={handleSaveEditing}
                    className="text-green-600 hover:text-green-500"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleCancelEditing}
                    className="text-red-400 hover:text-red-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Cancel className="w-4 h-4" />
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
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
                  <div className="flex space-x-1">
                    <motion.button
                      type="button"
                      onClick={() => handleStartEditing(key)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleRemoveHeader(key)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
