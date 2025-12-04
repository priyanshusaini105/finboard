"use client"
import { motion } from "framer-motion";
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { UrlParam, addParam, removeParam, updateParam } from "@/src/utils";

interface UrlParamsInputProps {
  params: UrlParam[];
  onParamsChange: (params: UrlParam[]) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03 },
  }),
};

export function UrlParamsInput({
  params,
  onParamsChange,
}: UrlParamsInputProps) {
  const [localParams, setLocalParams] = useState<UrlParam[]>(params);

  // Sync local params with props
  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handleAddParam = () => {
    const newParams = addParam(localParams);
    setLocalParams(newParams);
    onParamsChange(newParams);
  };

  const handleRemoveParam = (index: number) => {
    const newParams = removeParam(localParams, index);
    setLocalParams(newParams);
    onParamsChange(newParams);
  };

  const handleUpdateParam = (
    index: number,
    key: string,
    value: string
  ) => {
    const newParams = updateParam(localParams, index, key, value);
    setLocalParams(newParams);
    onParamsChange(newParams);
  };

  return (
    <motion.div
      custom={4}
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-300">
          URL Parameters
        </label>
        <motion.button
          type="button"
          onClick={handleAddParam}
          className="flex items-center space-x-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-3 h-3" />
          <span>Add Param</span>
        </motion.button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
        {localParams.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            No URL parameters. Click &quot;Add Param&quot; to add one.
          </p>
        ) : (
          localParams.map((param, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex gap-2 items-center"
            >
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) =>
                    handleUpdateParam(index, e.target.value, param.value)
                  }
                  placeholder="Parameter name (key)"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={param.value}
                  onChange={(e) =>
                    handleUpdateParam(index, param.key, e.target.value)
                  }
                  placeholder="Value"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <motion.button
                type="button"
                onClick={() => handleRemoveParam(index)}
                className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ))
        )}
      </div>

      {localParams.length > 0 && (
        <motion.p
          className="text-xs text-slate-500 dark:text-slate-400 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {localParams.filter((p) => p.key.trim()).length} parameter(s) configured
        </motion.p>
      )}
    </motion.div>
  );
}
