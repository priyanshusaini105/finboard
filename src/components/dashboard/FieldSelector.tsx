import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { APIField } from "../../types/widget";

interface FieldSelectorProps {
  apiFields: APIField[];
  selectedFields: string[];
  onFieldToggle: (fieldKey: string) => void;
  editingMode?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03 },
  }),
};

export function FieldSelector({
  apiFields,
  selectedFields,
  onFieldToggle,
  editingMode,
}: FieldSelectorProps) {
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");

  return (
    <motion.div
      custom={5}
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 my-2 mt-3">
        Select Fields to Display
      </label>

      <div className="mb-4">
        <input
          type="text"
          value={fieldSearchTerm}
          onChange={(e) => setFieldSearchTerm(e.target.value)}
          placeholder="Search for fields..."
          className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {/* Show currently selected fields when editing */}
        {editingMode && selectedFields.length > 0 && apiFields.length === 0 && (
          <>
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-300">
              Currently Selected Fields
            </h4>
            <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-4">
              <p className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                These are your currently selected fields. Click &quot;Test API&quot;
                to see all available fields and make changes.
              </p>
              <div className="space-y-2">
                {selectedFields.map((fieldKey) => (
                  <motion.div
                    key={fieldKey}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex-1">
                      <div className="text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {fieldKey}
                        {fieldKey.includes("[]") && (
                          <span className="text-xs bg-green-600 px-1 py-0.5 rounded">
                            Item Property
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Currently selected
                      </div>
                    </div>
                    <motion.button
                      onClick={() => onFieldToggle(fieldKey)}
                      className="px-2 py-1 rounded text-xs bg-emerald-500 text-white"
                      title="Remove field"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      −
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Show available fields when API has been tested */}
        {apiFields.length > 0 && (
          <>
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-300">
              Available Fields
            </h4>
            {apiFields
              .filter(
                (field) =>
                  field.key
                    .toLowerCase()
                    .includes(fieldSearchTerm.toLowerCase()) ||
                  field.type
                    .toLowerCase()
                    .includes(fieldSearchTerm.toLowerCase()) ||
                  String(field.value)
                    .toLowerCase()
                    .includes(fieldSearchTerm.toLowerCase())
              )
              .slice(0, 15)
              .map((field, index) => (
                <motion.div
                  key={field.key}
                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex-1">
                    <div className="text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      {field.key}
                      {field.type === "array" && (
                        <span className="text-xs bg-blue-600 px-1 py-0.5 rounded">
                          Array
                        </span>
                      )}
                      {field.key.includes("[]") && (
                        <span className="text-xs bg-green-600 px-1 py-0.5 rounded">
                          Item Property
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {field.type}:{" "}
                      {(field.type === "array"
                        ? String(field.value)
                        : String(field.value).substring(0, 50) +
                          (String(field.value).length > 50 ? "..." : "")) as React.ReactNode}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => onFieldToggle(field.key)}
                    className={`px-2 py-1 rounded text-xs ${
                      selectedFields.includes(field.key)
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {selectedFields.includes(field.key) ? "−" : "+"}
                  </motion.button>
                </motion.div>
              ))}
          </>
        )}

        {/* Show message when no fields and not editing */}
        {!editingMode && apiFields.length === 0 && (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            <p>Test your API connection first to see available fields</p>
          </div>
        )}
      </div>

      {selectedFields.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
            Selected Fields
          </h4>
          <div className="space-y-1">
            {selectedFields.map((fieldKey) => (
              <motion.div
                key={fieldKey}
                className="flex items-center justify-between p-2 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  {fieldKey}
                </span>
                <motion.button
                  onClick={() => onFieldToggle(fieldKey)}
                  className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
