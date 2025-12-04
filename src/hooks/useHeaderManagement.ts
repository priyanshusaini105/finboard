import { useState, useRef, useEffect } from "react";

interface UseHeaderManagementProps {
  initialHeaders?: Record<string, string>;
}

export function useHeaderManagement(props?: UseHeaderManagementProps) {
  const [headers, setHeaders] = useState<Record<string, string>>(props?.initialHeaders || {});
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const headerValueInputRef = useRef<HTMLInputElement>(null);

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setHeaders((prev) => ({
        ...prev,
        [newHeaderKey]: newHeaderValue,
      }));
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    setHeaders((prev) => {
      const newHeaders = { ...prev };
      delete newHeaders[key];
      return newHeaders;
    });
  };

  const startEditingHeader = (key: string) => {
    setEditingHeader(key);
    setEditingKey(key);
    setEditingValue(headers[key]);
  };

  const cancelEditingHeader = () => {
    setEditingHeader(null);
    setEditingKey("");
    setEditingValue("");
  };

  const saveEditingHeader = () => {
    if (editingKey && editingValue) {
      setHeaders((prev) => {
        const newHeaders = { ...prev };
        if (editingHeader !== editingKey) {
          delete newHeaders[editingHeader!];
        }
        newHeaders[editingKey] = editingValue;
        return newHeaders;
      });
    }
    cancelEditingHeader();
  };

  const addQuickHeader = (type: "api-key" | "bearer" | "basic") => {
    switch (type) {
      case "api-key":
        setNewHeaderKey("X-Api-Key");
        setNewHeaderValue("");
        break;
      case "bearer":
        setNewHeaderKey("Authorization");
        setNewHeaderValue("Bearer ");
        break;
      case "basic":
        setNewHeaderKey("Authorization");
        setNewHeaderValue("Basic ");
        break;
    }
  };

  // Auto-focus the input field when quick header is added and position cursor after prefix
  useEffect(() => {
    if (newHeaderKey && headerValueInputRef.current) {
      headerValueInputRef.current.focus();
      // For Bearer and Basic, position cursor after the prefix text
      if (newHeaderValue) {
        const prefixLength = newHeaderValue.length;
        headerValueInputRef.current.setSelectionRange(prefixLength, prefixLength);
      }
    }
  }, [newHeaderKey, newHeaderValue]);

  return {
    headers,
    setHeaders,
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
  };
}
