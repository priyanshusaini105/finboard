/**
 * Client-side encryption middleware for API secrets
 * Encrypts sensitive data (API keys, tokens) using RSA public key before sending to server
 */

import { logger } from "./logger";

// Common API key parameter names used in headers and query params
export const API_KEY_NAMES = [
  "apiKey",
  "api_key",
  "apikey",
  "token",
  "access_token",
  "accessToken",
  "authorization",
  "auth",
  "key",
  "x-api-key",
  "x-api-token",
  "x-auth-token",
  "bearer",
] as const;

export type ApiKeyName = (typeof API_KEY_NAMES)[number];

/**
 * Marker prefix for encrypted values in storage
 */
export const ENCRYPTED_VALUE_PREFIX = "__ENCRYPTED__:";

/**
 * Check if a string value is encrypted
 */
export function isEncryptedValue(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_VALUE_PREFIX);
}

/**
 * Wrap encrypted value with marker prefix
 */
export function wrapEncryptedValue(encryptedData: string): string {
  return `${ENCRYPTED_VALUE_PREFIX}${encryptedData}`;
}

/**
 * Unwrap encrypted value (remove marker prefix)
 */
export function unwrapEncryptedValue(value: string): string {
  if (!isEncryptedValue(value)) {
    throw new Error("Value is not encrypted");
  }
  return value.slice(ENCRYPTED_VALUE_PREFIX.length);
}

/**
 * localStorage key for storing encrypted secrets
 */
export const ENCRYPTED_SECRETS_KEY = "finboard_encrypted_secrets";

/**
 * Interface for stored encrypted secret
 */
export interface EncryptedSecret {
  widgetId: string;
  encrypted: string;
  keyName: string;
  timestamp: number;
}

/**
 * Detect if a string contains API key patterns
 * Looks for common patterns like sk-, pk-, Bearer, etc.
 */
export function detectApiKeyInString(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  
  // Common API key prefixes/patterns
  const apiKeyPatterns = [
    /^sk-/, // Stripe, OpenAI secret keys
    /^pk-/, // Public keys
    /^Bearer\s+/i, // Bearer tokens
    /^[A-Za-z0-9_-]{20,}$/, // Long alphanumeric strings (likely keys)
    /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64 encoded (likely keys)
  ];
  
  return apiKeyPatterns.some(pattern => pattern.test(value));
}

/**
 * Store encrypted secret in localStorage
 */
export function storeEncryptedSecret(
  widgetId: string,
  encrypted: string,
  keyName: string
): void {
  try {
    const secrets = getStoredSecrets();
    
    // Add or update secret for this widget
    const existingIndex = secrets.findIndex(s => s.widgetId === widgetId);
    const newSecret: EncryptedSecret = {
      widgetId,
      encrypted,
      keyName,
      timestamp: Date.now(),
    };
    
    if (existingIndex >= 0) {
      secrets[existingIndex] = newSecret;
    } else {
      secrets.push(newSecret);
    }
    
    // Clean up old secrets (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const cleanedSecrets = secrets.filter(s => s.timestamp > thirtyDaysAgo);
    
    localStorage.setItem(ENCRYPTED_SECRETS_KEY, JSON.stringify(cleanedSecrets));
    
    logger.debug("Stored encrypted secret", { widgetId, keyName });
  } catch (error) {
    logger.error("Failed to store encrypted secret", { error, widgetId });
    throw error;
  }
}

/**
 * Get encrypted secret for a widget
 */
export function getEncryptedSecret(widgetId: string): EncryptedSecret | null {
  try {
    const secrets = getStoredSecrets();
    return secrets.find(s => s.widgetId === widgetId) || null;
  } catch (error) {
    logger.error("Failed to get encrypted secret", { error, widgetId });
    return null;
  }
}

/**
 * Get all stored secrets
 */
export function getStoredSecrets(): EncryptedSecret[] {
  try {
    const stored = localStorage.getItem(ENCRYPTED_SECRETS_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    // Clean up old secrets (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const cleanedSecrets = parsed.filter(s => s.timestamp > thirtyDaysAgo);
    
    // Update storage if we cleaned anything up
    if (cleanedSecrets.length !== parsed.length) {
      localStorage.setItem(ENCRYPTED_SECRETS_KEY, JSON.stringify(cleanedSecrets));
      logger.debug("Cleaned up old encrypted secrets", {
        removed: parsed.length - cleanedSecrets.length,
      });
    }
    
    return cleanedSecrets;
  } catch (error) {
    logger.warn("Failed to parse stored secrets", { error });
    return [];
  }
}

/**
 * Check if a widget has an encrypted secret
 */
export function hasEncryptedSecret(widgetId: string): boolean {
  return getEncryptedSecret(widgetId) !== null;
}

/**
 * Remove encrypted secret for a widget
 */
export function removeEncryptedSecret(widgetId: string): void {
  try {
    const secrets = getStoredSecrets();
    const filtered = secrets.filter(s => s.widgetId !== widgetId);
    
    if (filtered.length === secrets.length) {
      // No secret was removed
      return;
    }
    
    localStorage.setItem(ENCRYPTED_SECRETS_KEY, JSON.stringify(filtered));
    logger.debug("Removed encrypted secret", { widgetId });
  } catch (error) {
    logger.error("Failed to remove encrypted secret", { error, widgetId });
  }
}

/**
 * Get RSA public key from environment
 */
function getPublicKey(): string {
  const publicKey = process.env.NEXT_PUBLIC_RSA_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("RSA public key not configured in environment");
  }
  return publicKey;
}

/**
 * Encrypt data using RSA public key (Web Crypto API)
 */
export async function encryptWithPublicKey(
  data: string
): Promise<string> {
  try {
    const publicKeyPem = getPublicKey();

    // Convert PEM to ArrayBuffer
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = publicKeyPem
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s+/g, "");
    
    const binaryDer = Uint8Array.from(atob(pemContents), (c) =>
      c.charCodeAt(0)
    );

    // Import the public key
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      binaryDer.buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );

    // Encrypt the data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      cryptoKey,
      dataBuffer
    );

    // Convert to base64
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

    logger.debug("Successfully encrypted data", {
      originalLength: data.length,
      encryptedLength: encryptedBase64.length,
    });

    return encryptedBase64;
  } catch (error) {
    logger.error("Failed to encrypt data", { error });
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypt an encrypted value if it's encrypted, otherwise return as-is
 * This allows seamless handling of both encrypted and plain values
 */
export function decryptOrPassthrough(value: string): string {
  if (isEncryptedValue(value)) {
    // For client-side, we can't decrypt (server-only operation)
    // So we just return the encrypted value as-is for transmission to server
    return value;
  }
  return value;
}

/**
 * Encrypt sensitive value if it contains API key patterns
 * If already encrypted, return as-is
 */
export async function encryptSensitiveValue(
  value: string
): Promise<string> {
  // Skip if already encrypted
  if (isEncryptedValue(value)) {
    return value;
  }
  
  // Encrypt if it looks like an API key
  if (detectApiKeyInString(value)) {
    const encrypted = await encryptWithPublicKey(value);
    return wrapEncryptedValue(encrypted);
  }
  return value;
}

/**
 * Encrypt all sensitive values in headers object
 */
export async function encryptHeaderValues(
  headers: Record<string, string>
): Promise<Record<string, string>> {
  const encrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    // Check if header key suggests it's sensitive
    const isSensitiveKey = API_KEY_NAMES.some(
      (name) => lowerKey.includes(name.toLowerCase())
    );
    
    if (isSensitiveKey || detectApiKeyInString(value)) {
      encrypted[key] = await encryptSensitiveValue(value);
    } else {
      encrypted[key] = value;
    }
  }
  
  return encrypted;
}

/**
 * Encrypt sensitive query parameters in URL
 */
export async function encryptUrlParams(url: string): Promise<string> {
  try {
    const urlObj = new URL(url);
    let modified = false;
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      
      // Check if param key suggests it's sensitive
      const isSensitiveKey = API_KEY_NAMES.some(
        (name) => lowerKey.includes(name.toLowerCase())
      );
      
      if (isSensitiveKey || detectApiKeyInString(value)) {
        const encrypted = await encryptSensitiveValue(value);
        urlObj.searchParams.set(key, encrypted);
        modified = true;
      }
    }
    
    if (modified) {
      logger.debug("Encrypted sensitive URL parameters");
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    logger.warn("Failed to parse URL for encryption", { error });
    return url;
  }
}

/**
 * Clear all encrypted secrets
 */
export function clearAllEncryptedSecrets(): void {
  try {
    localStorage.removeItem(ENCRYPTED_SECRETS_KEY);
    logger.info("Cleared all encrypted secrets");
  } catch (error) {
    logger.error("Failed to clear encrypted secrets", { error });
  }
}

/**
 * Detect and extract API key from headers or URL
 * Returns the key name and value
 */
export function detectApiKey(
  headers?: Record<string, string>,
  url?: string
): { keyName: string; value: string } | null {
  // Check headers first
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      const normalizedKey = key.toLowerCase();
      if (
        API_KEY_NAMES.some((name) => normalizedKey.includes(name.toLowerCase()))
      ) {
        // Handle Authorization header specially (may have 'Bearer ' prefix)
        if (normalizedKey === "authorization" && value.startsWith("Bearer ")) {
          return { keyName: key, value: value.substring(7) };
        }
        return { keyName: key, value };
      }
    }
  }

  // Check URL query parameters
  if (url) {
    try {
      const urlObj = new URL(url);
      for (const [key, value] of urlObj.searchParams.entries()) {
        const normalizedKey = key.toLowerCase();
        if (
          API_KEY_NAMES.some((name) =>
            normalizedKey.includes(name.toLowerCase())
          )
        ) {
          return { keyName: key, value };
        }
      }
    } catch (error) {
      logger.warn("Failed to parse URL for API key detection", { url, error });
    }
  }

  return null;
}

/**
 * Encrypt API secrets in widget configuration
 * This should be called when user inputs API keys
 */
export async function encryptWidgetSecrets(
  widgetId: string,
  headers?: Record<string, string>,
  apiUrl?: string
): Promise<{
  encryptedPayload: string;
  keyName: string;
} | null> {
  const apiKey = detectApiKey(headers, apiUrl);

  if (!apiKey) {
    logger.debug("No API key detected in widget configuration", { widgetId });
    return null;
  }

  try {
    // Encrypt the API key value
    const encrypted = await encryptWithPublicKey(apiKey.value);

    // Store in localStorage for future use
    storeEncryptedSecret(widgetId, encrypted, apiKey.keyName);

    logger.info("Encrypted widget secrets", {
      widgetId,
      keyName: apiKey.keyName,
    });

    return {
      encryptedPayload: encrypted,
      keyName: apiKey.keyName,
    };
  } catch (error) {
    logger.error("Failed to encrypt widget secrets", { error, widgetId });
    throw error;
  }
}

/**
 * Prepare headers for proxy request by extracting encrypted values
 * and sending them to the server for decryption
 */
export function prepareProxyHeaders(
  widgetId: string,
  originalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!originalHeaders) return headers;

  // Check if headers contain encrypted values
  let hasEncryptedValues = false;
  const encryptedSecrets: Array<{ keyName: string; value: string }> = [];

  for (const [key, value] of Object.entries(originalHeaders)) {
    if (isEncryptedValue(value)) {
      hasEncryptedValues = true;
      encryptedSecrets.push({
        keyName: key,
        value: unwrapEncryptedValue(value),
      });
    } else {
      headers[key] = value;
    }
  }

  // If we have encrypted values, send them to proxy for decryption
  if (hasEncryptedValues) {
    // Send encrypted secrets as JSON in a special header
    headers["X-Encrypted-Secrets"] = JSON.stringify(encryptedSecrets);
    
    logger.debug("Prepared proxy headers with encrypted secrets", {
      widgetId,
      secretCount: encryptedSecrets.length,
    });
  }

  return headers;
}

/**
 * Prepare headers for display in edit form
 * Returns headers as-is (encrypted values remain encrypted)
 */
export function prepareHeadersForDisplay(
  headers: Record<string, string>
): Record<string, string> {
  // Return headers as-is, encrypted values will be kept encrypted
  return { ...headers };
}

/**
 * Prepare URL for display in edit form
 * Returns URL as-is (encrypted params remain encrypted)
 */
export function prepareUrlForDisplay(url: string): string {
  // Return URL as-is, encrypted params will be kept encrypted
  return url;
}

/**
 * Clean headers before saving (remove empty values)
 */
export function cleanHeadersBeforeSave(
  newHeaders: Record<string, string>,
  existingHeaders: Record<string, string>
): Record<string, string> {
  const cleaned: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(newHeaders)) {
    if (value && value.trim()) {
      // Only include non-empty values
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Prepare URL for proxy request by extracting encrypted query params
 */
export function prepareProxyUrl(url: string): {
  url: string;
  encryptedParams: Array<{ keyName: string; value: string }>;
} {
  try {
    const urlObj = new URL(url);
    const encryptedParams: Array<{ keyName: string; value: string }> = [];
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (isEncryptedValue(value)) {
        encryptedParams.push({
          keyName: key,
          value: unwrapEncryptedValue(value),
        });
        // Remove encrypted param from URL (will be decrypted server-side)
        urlObj.searchParams.delete(key);
      }
    }
    
    return {
      url: urlObj.toString(),
      encryptedParams,
    };
  } catch (error) {
    logger.warn("Failed to parse URL for encrypted params", { error });
    return { url, encryptedParams: [] };
  }
}
