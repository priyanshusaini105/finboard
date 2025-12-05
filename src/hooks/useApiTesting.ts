import { useState } from "react";
import { APIField } from "@/src/types";
import { addSignatureHeaders, prepareProxyUrl, prepareProxyHeaders } from "@/src/utils";

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
      // Prepare URL and extract encrypted params
      const urlInfo = prepareProxyUrl(apiUrl);
      const cleanUrl = urlInfo.url;
      const encryptedParams = urlInfo.encryptedParams;
      
      // Always use proxy for API requests to handle CORS, encryption, and security
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
      console.log('[API Test] Using proxy for:', cleanUrl);
      console.log('[API Test] Encrypted params:', encryptedParams.length);
      console.log('[API Test] Headers:', headers);
      
      // Prepare headers with encrypted values (use temp ID for API testing)
      const proxyHeaders = prepareProxyHeaders('api-test', headers);
      
      // Add encrypted params to headers if present
      let requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...proxyHeaders,
      };
      
      if (encryptedParams.length > 0) {
        requestHeaders["X-Encrypted-Params"] = JSON.stringify(encryptedParams);
        console.log('[API Test] Added encrypted params to headers');
      }
      
      // Add HMAC signature headers to prevent replay attacks
      try {
        requestHeaders = await addSignatureHeaders(
          "GET",
          proxyUrl,
          requestHeaders
        );
        console.log('[API Test] Added signature headers');
      } catch (error) {
        console.warn('[API Test] Failed to add signature, continuing without:', error);
      }
      
      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: requestHeaders,
      });

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
