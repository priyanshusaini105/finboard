/**
 * Request signing and validation using HMAC-SHA256
 * Prevents replay attacks and ensures request integrity
 */

import { logger } from "./logger";

/**
 * Generate a random nonce (number used once)
 */
export function generateNonce(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate random string
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Get current timestamp in seconds
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create signature payload from request parameters
 */
export function createSignaturePayload(
  method: string,
  url: string,
  timestamp: number,
  nonce: string,
  body?: string
): string {
  // Canonical format: METHOD\nURL\nTIMESTAMP\nNONCE\nBODY
  const parts = [
    method.toUpperCase(),
    url,
    timestamp.toString(),
    nonce,
    body || "",
  ];
  
  return parts.join("\n");
}

/**
 * Sign request using HMAC-SHA256 (client-side)
 */
export async function signRequest(
  method: string,
  url: string,
  timestamp: number,
  nonce: string,
  secret: string,
  body?: string
): Promise<string> {
  try {
    const payload = createSignaturePayload(method, url, timestamp, nonce, body);
    
    // Import HMAC key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Sign the payload
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    // Convert to hex string
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    logger.debug("Request signed successfully", {
      method,
      url: url.substring(0, 50),
      timestamp,
    });
    
    return signature;
  } catch (error) {
    logger.error("Failed to sign request", { error });
    throw new Error("Request signing failed");
  }
}

/**
 * Verify request signature (server-side)
 */
export async function verifySignature(
  method: string,
  url: string,
  timestamp: number,
  nonce: string,
  signature: string,
  secret: string,
  body?: string
): Promise<boolean> {
  try {
    // Generate expected signature
    const expectedSignature = await signRequestServerSide(
      method,
      url,
      timestamp,
      nonce,
      secret,
      body
    );
    
    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(signature, expectedSignature);
  } catch (error) {
    logger.error("Failed to verify signature", { error });
    return false;
  }
}

/**
 * Sign request using Node.js crypto (server-side)
 */
export async function signRequestServerSide(
  method: string,
  url: string,
  timestamp: number,
  nonce: string,
  secret: string,
  body?: string
): Promise<string> {
  const payload = createSignaturePayload(method, url, timestamp, nonce, body);
  
  // Use Node.js crypto for server-side
  if (typeof window === "undefined") {
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return hmac.digest("hex");
  }
  
  // Use Web Crypto API for client-side
  return signRequest(method, url, timestamp, nonce, secret, body);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Validate timestamp to prevent replay attacks
 * Default window: 5 minutes (300 seconds)
 */
export function validateTimestamp(
  timestamp: number,
  windowSeconds: number = 300
): boolean {
  const now = getTimestamp();
  const diff = Math.abs(now - timestamp);
  
  if (diff > windowSeconds) {
    logger.warn("Request timestamp outside acceptable window", {
      timestamp,
      now,
      diff,
      windowSeconds,
    });
    return false;
  }
  
  return true;
}

/**
 * In-memory nonce cache to prevent replay attacks
 * In production, use Redis or similar distributed cache
 */
const nonceCache = new Map<string, number>();

// Cleanup old nonces every 5 minutes
if (typeof global !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    for (const [nonce, timestamp] of nonceCache.entries()) {
      if (timestamp < fiveMinutesAgo) {
        nonceCache.delete(nonce);
      }
    }
  };
  
  if (!("nonceCleanupInterval" in global)) {
    (global as Record<string, unknown>).nonceCleanupInterval = setInterval(
      cleanup,
      5 * 60 * 1000
    );
  }
}

/**
 * Check if nonce has been used (server-side)
 */
export function isNonceUsed(nonce: string): boolean {
  return nonceCache.has(nonce);
}

/**
 * Mark nonce as used (server-side)
 */
export function markNonceUsed(nonce: string): void {
  nonceCache.set(nonce, Date.now());
  
  logger.debug("Nonce marked as used", { nonce });
}

/**
 * Clear nonce cache (for testing)
 */
export function clearNonceCache(): void {
  nonceCache.clear();
}

/**
 * Get HMAC secret from environment
 */
export function getHmacSecret(): string {
  const secret = process.env.NEXT_PUBLIC_HMAC_SECRET || process.env.HMAC_SECRET;
  
  if (!secret) {
    throw new Error("HMAC secret not configured");
  }
  
  return secret;
}

/**
 * Add signature headers to request (client-side)
 */
export async function addSignatureHeaders(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): Promise<Record<string, string>> {
  try {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const secret = getHmacSecret();
    
    const signature = await signRequest(
      method,
      url,
      timestamp,
      nonce,
      secret,
      body
    );
    
    return {
      ...headers,
      "X-Request-Timestamp": timestamp.toString(),
      "X-Request-Nonce": nonce,
      "X-Request-Signature": signature,
    };
  } catch (error) {
    logger.error("Failed to add signature headers", { error });
    throw error;
  }
}

/**
 * Validate request signature from headers (server-side)
 */
export async function validateRequestSignature(
  method: string,
  url: string,
  headers: Headers,
  body?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const timestamp = headers.get("X-Request-Timestamp");
    const nonce = headers.get("X-Request-Nonce");
    const signature = headers.get("X-Request-Signature");
    
    if (!timestamp || !nonce || !signature) {
      return {
        valid: false,
        error: "Missing signature headers",
      };
    }
    
    const timestampNum = parseInt(timestamp, 10);
    
    // Validate timestamp
    if (!validateTimestamp(timestampNum)) {
      return {
        valid: false,
        error: "Request timestamp expired or invalid",
      };
    }
    
    // Check for replay attack
    if (isNonceUsed(nonce)) {
      logger.warn("Replay attack detected - nonce already used", { nonce });
      return {
        valid: false,
        error: "Request nonce already used (replay attack)",
      };
    }
    
    // Verify signature
    const secret = getHmacSecret();
    const valid = await verifySignature(
      method,
      url,
      timestampNum,
      nonce,
      signature,
      secret,
      body
    );
    
    if (!valid) {
      return {
        valid: false,
        error: "Invalid request signature",
      };
    }
    
    // Mark nonce as used
    markNonceUsed(nonce);
    
    logger.info("Request signature validated successfully", {
      method,
      url: url.substring(0, 50),
    });
    
    return { valid: true };
  } catch (error) {
    logger.error("Signature validation error", { error });
    return {
      valid: false,
      error: "Signature validation failed",
    };
  }
}
