"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  version: string;
  config: any;
  widgets: any[];
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.05 },
  }),
};

export function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const { loadDashboardFromTemplate } = useStore();

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/templates.json");
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (template: Template) => {
    loadDashboardFromTemplate(template.config, template.widgets);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 dark:bg-black flex items-center justify-center z-50"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <motion.h2
                className="text-2xl font-bold text-slate-900 dark:text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                Pre-built Dashboard Templates
              </motion.h2>
              <motion.button
                onClick={onClose}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-transform"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Description */}
            <motion.p
              className="text-slate-600 dark:text-slate-400 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.1 }}
            >
              Choose a pre-built template to quickly set up your dashboard with
              pre-configured widgets and settings.
            </motion.p>

            {/* Templates Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial="hidden"
                animate="visible"
              >
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    custom={index}
                    variants={itemVariants}
                    className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors cursor-pointer group"
                    onClick={() => handleLoadTemplate(template)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="text-4xl flex-shrink-0 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                        {template.thumbnail}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {template.description}
                        </p>

                        {/* Template Info */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            <Zap className="w-3 h-3" />
                            {template.widgets.length} widgets
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                            v{template.version}
                          </span>
                        </div>

                        {/* Load Button */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadTemplate(template);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded-lg transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Load Template
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Coming Soon Notice */}
            {!loading && templates.length > 0 && (
              <motion.div
                className="mt-8 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border border-dashed border-slate-300 dark:border-slate-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.2 }}
              >
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white mb-1">
                      More templates coming soon
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      We're working on additional pre-built templates for
                      cryptocurrency, financial data, and more. Stay tuned!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
