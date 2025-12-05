/**
 * Server-side decryption utility for API secrets
 * Decrypts client-encrypted secrets using RSA private key
 */

import crypto from "crypto";
import { logger } from "./logger";

/**
 * Get RSA private key from environment
 * This should NEVER be exposed to the client
 */
function getPrivateKey(): string {
  const privateKey = process.env.RSA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("RSA private key not configured in environment");
  }
  return privateKey;
}

/**
 * Decrypt data using RSA private key (Node.js crypto)
 */
export function decryptWithPrivateKey(encryptedData: string): string {
  try {
    const privateKey = getPrivateKey();

    // Decode base64
    const encryptedBuffer = Buffer.from(encryptedData, "base64");

    // Decrypt using private key
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      encryptedBuffer
    );

    const decryptedText = decrypted.toString("utf8");

    logger.debug("Successfully decrypted data", {
      encryptedLength: encryptedData.length,
      decryptedLength: decryptedText.length,
    });

    return decryptedText;
  } catch (error) {
    logger.error("Failed to decrypt data", { error });
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Extract and decrypt API secrets from request headers (new format)
 * Handles multiple encrypted secrets sent as JSON
 */
export function extractAndDecryptSecrets(
  headers: Headers
): Record<string, string> {
  const encryptedSecretsHeader = headers.get("X-Encrypted-Secrets");
  
  if (!encryptedSecretsHeader) {
    logger.debug("No encrypted secrets found in headers");
    return {};
  }

  try {
    const encryptedSecrets = JSON.parse(encryptedSecretsHeader) as Array<{
      keyName: string;
      value: string;
    }>;

    const decryptedHeaders: Record<string, string> = {};

    for (const { keyName, value } of encryptedSecrets) {
      const decryptedValue = decryptWithPrivateKey(value);
      decryptedHeaders[keyName] = decryptedValue;

      logger.info("Successfully decrypted API secret", {
        keyName,
        valueLength: decryptedValue.length,
      });
    }

    return decryptedHeaders;
  } catch (error) {
    logger.error("Failed to extract and decrypt secrets", { error });
    throw new Error("Failed to decrypt API secrets");
  }
}

/**
 * Extract and decrypt API secret from request headers (legacy format)
 */
export function extractAndDecryptSecret(
  headers: Headers
): { keyName: string; value: string } | null {
  const encryptedSecret = headers.get("X-Encrypted-Secret");
  const keyName = headers.get("X-Secret-Key-Name");

  if (!encryptedSecret || !keyName) {
    logger.debug("No encrypted secret found in headers");
    return null;
  }

  try {
    const decryptedValue = decryptWithPrivateKey(encryptedSecret);

    logger.info("Successfully decrypted API secret", {
      keyName,
      valueLength: decryptedValue.length,
    });

    return { keyName, value: decryptedValue };
  } catch (error) {
    logger.error("Failed to extract and decrypt secret", { error, keyName });
    throw new Error("Failed to decrypt API secret");
  }
}

/**
 * Normalize API key header name
 * Converts various formats to standard header format
 */
export function normalizeHeaderName(keyName: string): string {
  // Common transformations
  const lowerKey = keyName.toLowerCase();

  if (lowerKey === "authorization" || lowerKey === "bearer") {
    return "Authorization";
  }

  if (lowerKey.includes("api") && lowerKey.includes("key")) {
    return "X-Api-Key";
  }

  // Default: Title case with hyphens
  return keyName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("-");
}

/**
 * Prepare headers with decrypted secret for upstream API call
 */
export function prepareUpstreamHeaders(
  requestHeaders: Headers,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "FinBoard/1.0",
    Accept: "application/json",
    ...(additionalHeaders || {}),
  };

  // Try new format first (multiple secrets)
  const decryptedSecrets = extractAndDecryptSecrets(requestHeaders);
  
  if (Object.keys(decryptedSecrets).length > 0) {
    // Add all decrypted secrets to headers
    for (const [keyName, value] of Object.entries(decryptedSecrets)) {
      const normalizedKeyName = normalizeHeaderName(keyName);

      // Handle Authorization header specially (add Bearer prefix if needed)
      if (normalizedKeyName === "Authorization") {
        if (!value.startsWith("Bearer ")) {
          headers[normalizedKeyName] = `Bearer ${value}`;
        } else {
          headers[normalizedKeyName] = value;
        }
      } else {
        headers[normalizedKeyName] = value;
      }
    }

    logger.debug("Prepared upstream headers with decrypted secrets", {
      secretCount: Object.keys(decryptedSecrets).length,
    });
    
    return headers;
  }

  // Fallback to legacy format (single secret)
  const secret = extractAndDecryptSecret(requestHeaders);

  if (secret) {
    const normalizedKeyName = normalizeHeaderName(secret.keyName);

    // Handle Authorization header specially (add Bearer prefix if needed)
    if (normalizedKeyName === "Authorization") {
      if (!secret.value.startsWith("Bearer ")) {
        headers[normalizedKeyName] = `Bearer ${secret.value}`;
      } else {
        headers[normalizedKeyName] = secret.value;
      }
    } else {
      headers[normalizedKeyName] = secret.value;
    }

    logger.debug("Prepared upstream headers with decrypted secret", {
      headerName: normalizedKeyName,
    });
  } else {
    // Fallback: Copy any existing API keys from request headers
    // This handles cases where encryption is not used
    const authHeader = requestHeaders.get("authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const apiKeyHeader = requestHeaders.get("x-api-key");
    if (apiKeyHeader) {
      headers["X-Api-Key"] = apiKeyHeader;
    }

    logger.debug("No encrypted secret, using direct headers", {
      hasAuth: !!authHeader,
      hasApiKey: !!apiKeyHeader,
    });
  }

  return headers;
}

/**
 * Add decrypted secret to URL query parameters
 * Used when API requires key in query string
 */
export function addSecretToUrl(url: string, requestHeaders: Headers): string {
  try {
    const urlObj = new URL(url);
    let modified = false;

    // First, check for new format with encrypted params in header
    const encryptedParamsHeader = requestHeaders.get("X-Encrypted-Params");
    if (encryptedParamsHeader) {
      try {
        const encryptedParams = JSON.parse(encryptedParamsHeader) as Array<{
          keyName: string;
          value: string;
        }>;

        for (const { keyName, value } of encryptedParams) {
          const decryptedValue = decryptWithPrivateKey(value);
          urlObj.searchParams.set(keyName, decryptedValue);
          modified = true;

          logger.debug("Added decrypted param to URL", {
            keyName,
            valueLength: decryptedValue.length,
          });
        }

        if (modified) {
          logger.info("Successfully added encrypted URL parameters", {
            paramCount: encryptedParams.length,
          });
          return urlObj.toString();
        }
      } catch (error) {
        logger.error("Failed to decrypt URL parameters", { error });
        // Fall through to legacy method
      }
    }

    // Fallback to legacy single secret method
    const secret = extractAndDecryptSecret(requestHeaders);

    if (!secret) {
      return url;
    }

    // Check if the key name suggests it should be in query params
    const lowerKeyName = secret.keyName.toLowerCase();
    const isQueryParam =
      lowerKeyName === "apikey" ||
      lowerKeyName === "api_key" ||
      lowerKeyName === "token" ||
      lowerKeyName === "key";

    if (isQueryParam) {
      urlObj.searchParams.set(secret.keyName, secret.value);
      logger.debug("Added decrypted secret to URL query params", {
        keyName: secret.keyName,
      });
      return urlObj.toString();
    }

    return url;
  } catch (error) {
    logger.error("Failed to add secret to URL", { error, url });
    return url;
  }
}

