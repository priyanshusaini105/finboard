"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Zap, AlertCircle } from "lucide-react";
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

interface ApiKeyInput {
  [key: string]: string;
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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyInput>({});
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
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

  // Extract unique API keys needed from template widgets
  const getRequiredApiKeys = (template: Template) => {
    const apiUrls = template.widgets.map((w) => w.apiUrl);
    const keys: { [key: string]: string } = {};

    apiUrls.forEach((url) => {
      if (url.includes("finnhub.io")) {
        keys["finnhub_token"] = "Finnhub API Token";
      } else if (url.includes("alphavantage.co")) {
        keys["alphavantage_key"] = "Alpha Vantage API Key";
      } else if (url.includes("stock.indianapi.in")) {
        keys["indianstock_key"] = "Indian Stock API Key";
      }
    });

    return keys;
  };

  const handleTemplateClick = (template: Template) => {
    const requiredKeys = getRequiredApiKeys(template);
    if (Object.keys(requiredKeys).length > 0) {
      setSelectedTemplate(template);
      setApiKeys({});
      setShowApiKeyForm(true);
    } else {
      loadDashboardFromTemplate(template.config, template.widgets);
      onClose();
    }
  };

  const handleLoadWithApiKeys = () => {
    if (!selectedTemplate) return;

    // Replace API keys in widgets
    const updatedWidgets = selectedTemplate.widgets.map((widget) => {
      let updatedUrl = widget.apiUrl;
      let updatedHeaders = { ...widget.headers };

      // Replace Finnhub token
      if (apiKeys.finnhub_token && updatedUrl.includes("finnhub.io")) {
        updatedUrl = updatedUrl.replace(
          /token=[^&]*/,
          `token=${encodeURIComponent(apiKeys.finnhub_token)}`
        );
      }

      // Replace Alpha Vantage key
      if (apiKeys.alphavantage_key && updatedUrl.includes("alphavantage.co")) {
        updatedUrl = updatedUrl.replace(
          /apikey=[^&]*/,
          `apikey=${encodeURIComponent(apiKeys.alphavantage_key)}`
        );
      }

      // Replace Indian Stock API key
      if (apiKeys.indianstock_key && updatedUrl.includes("stock.indianapi.in")) {
        updatedHeaders["X-Api-Key"] = apiKeys.indianstock_key;
      }

      return {
        ...widget,
        apiUrl: updatedUrl,
        headers: updatedHeaders,
      };
    });

    loadDashboardFromTemplate(selectedTemplate.config, updatedWidgets);
    setShowApiKeyForm(false);
    setSelectedTemplate(null);
    onClose();
  };

  const handleApiKeyChange = (key: string, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const requiredKeys = selectedTemplate
    ? getRequiredApiKeys(selectedTemplate)
    : {};
  const allKeysProvided = Object.keys(requiredKeys).every(
    (key) => apiKeys[key]?.trim()
  );

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

            {/* API Key Form */}
            {showApiKeyForm && selectedTemplate && (
              <motion.div
                className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      API Keys Required
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Please provide your API keys to configure the widgets in this
                      template.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(requiredKeys).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">
                        {label}
                      </label>
                      <input
                        type="password"
                        value={apiKeys[key] || ""}
                        onChange={(e) => handleApiKeyChange(key, e.target.value)}
                        placeholder={`Enter your ${label}`}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <motion.button
                    onClick={() => {
                      setShowApiKeyForm(false);
                      setSelectedTemplate(null);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleLoadWithApiKeys}
                    disabled={!allKeysProvided}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    whileHover={allKeysProvided ? { scale: 1.02 } : undefined}
                    whileTap={allKeysProvided ? { scale: 0.98 } : undefined}
                  >
                    Load Template
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Templates Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : !showApiKeyForm ? (
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
                    onClick={() => handleTemplateClick(template)}
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
                            handleTemplateClick(template);
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
            ) : null}

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
