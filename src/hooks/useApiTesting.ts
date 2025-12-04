import { useState } from "react";
import { APIField } from "@/src/types";

export function useApiTesting() {
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiFields, setApiFields] = useState<APIField[]>([]);
  const [apiTestSuccess, setApiTestSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const testApiConnection = async (
    apiUrl: string,
    headers: Record<string, string>
  ): Promise<boolean> => {
    if (!apiUrl) return false;

    setIsTestingApi(true);

    try {
      // Check if we need to use proxy for external APIs
      const needsProxy =
        apiUrl.includes("finnhub.io") || 
        apiUrl.includes("alphavantage.co") ||
        apiUrl.includes("indianapi.in");

      let response;

      if (needsProxy) {
        // Use proxy for external APIs that have CORS issues
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}`;
        console.log('[API Test] Using proxy with headers:', headers);
        response = await fetch(proxyUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
      } else {
        // Direct request for APIs without CORS issues
        console.log('[API Test] Direct request with headers:', headers);
        response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract fields from API response
      const extractFields = (obj: unknown, prefix = ""): APIField[] => {
        const fields: APIField[] = [];

        if (typeof obj !== "object" || obj === null) {
          return fields;
        }

        for (const [key, value] of Object.entries(obj)) {
          const fieldKey = prefix ? `${prefix}.${key}` : key;

          if (Array.isArray(value)) {
            // Handle arrays - add the array itself as a field
            fields.push({
              key: fieldKey,
              value: `Array(${value.length}) - ${
                value.length > 0 ? "Click to see items" : "Empty"
              }`,
              type: "array",
            });

            // If array has objects, extract fields from the first object to show available properties
            if (
              value.length > 0 &&
              typeof value[0] === "object" &&
              value[0] !== null
            ) {
              const sampleObject = value[0] as Record<string, unknown>;
              for (const [objKey, objValue] of Object.entries(sampleObject)) {
                const objectFieldKey = `${fieldKey}[].${objKey}`;
                fields.push({
                  key: objectFieldKey,
                  value: objValue,
                  type: typeof objValue,
                });
              }
            }
          } else if (typeof value === "object" && value !== null) {
            // Handle nested objects
            fields.push(...extractFields(value, fieldKey));
          } else {
            // Handle primitive values
            fields.push({
              key: fieldKey,
              value: value,
              type: typeof value,
            });
          }
        }
        return fields;
      };

      const fields = extractFields(data);
      setApiFields(fields);
      setApiTestSuccess(true);
      setApiError("");
      return true;
    } catch (error) {
      console.error("API test error:", error);
      setApiError("Failed to connect to API. Please check the URL.");
      setApiTestSuccess(false);
      return false;
    } finally {
      setIsTestingApi(false);
    }
  };

  const resetApiState = () => {
    setIsTestingApi(false);
    setApiFields([]);
    setApiTestSuccess(false);
    setApiError("");
  };

  return {
    isTestingApi,
    apiFields,
    apiTestSuccess,
    apiError,
    testApiConnection,
    resetApiState,
    setApiFields,
    setApiTestSuccess,
    setApiError,
  };
}
