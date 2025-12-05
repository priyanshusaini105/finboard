/**
 * Tests for request signing and HMAC validation
 * @jest-environment node
 */

import {
  generateNonce,
  getTimestamp,
  createSignaturePayload,
  signRequest,
  signRequestServerSide,
  constantTimeCompare,
  validateTimestamp,
  isNonceUsed,
  markNonceUsed,
  clearNonceCache,
  addSignatureHeaders,
  validateRequestSignature,
} from "../requestSigning";
import { webcrypto } from "crypto";

// Mock environment
const mockHmacSecret = "test-hmac-secret-key-for-testing";

// Setup
beforeAll(() => {
  process.env.NEXT_PUBLIC_HMAC_SECRET = mockHmacSecret;
  process.env.HMAC_SECRET = mockHmacSecret;

  // Use real Node.js Web Crypto API
  if (!global.crypto) {
    Object.defineProperty(global, "crypto", {
      value: webcrypto,
      writable: true,
      configurable: true,
    });
  }
});

afterEach(() => {
  clearNonceCache();
});

describe("requestSigning", () => {
  describe("generateNonce", () => {
    it("should generate a unique nonce", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).toBeDefined();
      expect(typeof nonce1).toBe("string");
      expect(nonce1.length).toBeGreaterThan(0);
      expect(nonce1).not.toBe(nonce2);
    });

    it("should generate hex string when randomUUID not available", () => {
      const originalUUID = mockCrypto.randomUUID;
      delete (mockCrypto as { randomUUID?: () => string }).randomUUID;

      const nonce = generateNonce();

      expect(nonce).toBeDefined();
      expect(nonce).toMatch(/^[0-9a-f]+$/);

      mockCrypto.randomUUID = originalUUID;
    });
  });

  describe("getTimestamp", () => {
    it("should return current timestamp in seconds", () => {
      const timestamp = getTimestamp();
      const now = Math.floor(Date.now() / 1000);

      expect(timestamp).toBe(now);
      expect(typeof timestamp).toBe("number");
    });
  });

  describe("createSignaturePayload", () => {
    it("should create canonical payload format", () => {
      const payload = createSignaturePayload(
        "GET",
        "https://api.example.com/data",
        1234567890,
        "test-nonce",
        '{"key":"value"}'
      );

      expect(payload).toBe(
        "GET\nhttps://api.example.com/data\n1234567890\ntest-nonce\n{\"key\":\"value\"}"
      );
    });

    it("should handle empty body", () => {
      const payload = createSignaturePayload(
        "GET",
        "https://api.example.com/data",
        1234567890,
        "test-nonce"
      );

      expect(payload).toBe(
        "GET\nhttps://api.example.com/data\n1234567890\ntest-nonce\n"
      );
    });

    it("should normalize method to uppercase", () => {
      const payload = createSignaturePayload(
        "get",
        "https://api.example.com/data",
        1234567890,
        "test-nonce"
      );

      expect(payload).toContain("GET\n");
    });
  });

  describe("constantTimeCompare", () => {
    it("should return true for equal strings", () => {
      const result = constantTimeCompare("hello", "hello");
      expect(result).toBe(true);
    });

    it("should return false for different strings", () => {
      const result = constantTimeCompare("hello", "world");
      expect(result).toBe(false);
    });

    it("should return false for different lengths", () => {
      const result = constantTimeCompare("hello", "hello!");
      expect(result).toBe(false);
    });

    it("should be case-sensitive", () => {
      const result = constantTimeCompare("Hello", "hello");
      expect(result).toBe(false);
    });
  });

  describe("validateTimestamp", () => {
    it("should accept recent timestamp", () => {
      const timestamp = getTimestamp();
      const result = validateTimestamp(timestamp);

      expect(result).toBe(true);
    });

    it("should accept timestamp within window", () => {
      const timestamp = getTimestamp() - 60; // 1 minute ago
      const result = validateTimestamp(timestamp, 300); // 5 minute window

      expect(result).toBe(true);
    });

    it("should reject old timestamp", () => {
      const timestamp = getTimestamp() - 400; // 6.67 minutes ago
      const result = validateTimestamp(timestamp, 300); // 5 minute window

      expect(result).toBe(false);
    });

    it("should reject future timestamp outside window", () => {
      const timestamp = getTimestamp() + 400; // 6.67 minutes in future
      const result = validateTimestamp(timestamp, 300); // 5 minute window

      expect(result).toBe(false);
    });

    it("should use custom window", () => {
      const timestamp = getTimestamp() - 70; // 70 seconds ago
      const result = validateTimestamp(timestamp, 60); // 1 minute window

      expect(result).toBe(false);
    });
  });

  describe("nonce management", () => {
    it("should mark nonce as used", () => {
      const nonce = "test-nonce-123";

      expect(isNonceUsed(nonce)).toBe(false);

      markNonceUsed(nonce);

      expect(isNonceUsed(nonce)).toBe(true);
    });

    it("should detect replay with same nonce", () => {
      const nonce = "test-nonce-replay";

      markNonceUsed(nonce);

      expect(isNonceUsed(nonce)).toBe(true);
      expect(isNonceUsed(nonce)).toBe(true); // Can check multiple times
    });

    it("should clear nonce cache", () => {
      const nonce = "test-nonce-clear";

      markNonceUsed(nonce);
      expect(isNonceUsed(nonce)).toBe(true);

      clearNonceCache();

      expect(isNonceUsed(nonce)).toBe(false);
    });

    it("should handle multiple nonces", () => {
      const nonce1 = "nonce-1";
      const nonce2 = "nonce-2";
      const nonce3 = "nonce-3";

      markNonceUsed(nonce1);
      markNonceUsed(nonce2);

      expect(isNonceUsed(nonce1)).toBe(true);
      expect(isNonceUsed(nonce2)).toBe(true);
      expect(isNonceUsed(nonce3)).toBe(false);
    });
  });

  describe("signRequest", () => {
    it("should sign request successfully", async () => {
      const signature = await signRequest(
        "GET",
        "https://api.example.com/data",
        getTimestamp(),
        "test-nonce",
        mockHmacSecret
      );

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBeGreaterThan(0);
      expect(mockCrypto.subtle.sign).toHaveBeenCalled();
    });

    it("should throw error if signing fails", async () => {
      mockCrypto.subtle.sign = jest
        .fn()
        .mockRejectedValue(new Error("Signing failed"));

      await expect(
        signRequest(
          "GET",
          "https://api.example.com/data",
          getTimestamp(),
          "test-nonce",
          mockHmacSecret
        )
      ).rejects.toThrow("Request signing failed");
    });
  });

  describe("addSignatureHeaders", () => {
    it("should add signature headers to request", async () => {
      const originalHeaders = {
        "Content-Type": "application/json",
      };

      const headers = await addSignatureHeaders(
        "GET",
        "https://api.example.com/data",
        originalHeaders
      );

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Request-Timestamp"]).toBeDefined();
      expect(headers["X-Request-Nonce"]).toBeDefined();
      expect(headers["X-Request-Signature"]).toBeDefined();
    });

    it("should preserve existing headers", async () => {
      const originalHeaders = {
        "Content-Type": "application/json",
        "X-Custom-Header": "custom-value",
      };

      const headers = await addSignatureHeaders(
        "GET",
        "https://api.example.com/data",
        originalHeaders
      );

      expect(headers["X-Custom-Header"]).toBe("custom-value");
    });

    it("should throw error if HMAC secret not configured", async () => {
      delete process.env.NEXT_PUBLIC_HMAC_SECRET;
      delete process.env.HMAC_SECRET;

      await expect(
        addSignatureHeaders(
          "GET",
          "https://api.example.com/data",
          {}
        )
      ).rejects.toThrow("HMAC secret not configured");

      // Restore
      process.env.NEXT_PUBLIC_HMAC_SECRET = mockHmacSecret;
      process.env.HMAC_SECRET = mockHmacSecret;
    });
  });

  describe("validateRequestSignature", () => {
    it("should validate valid signature", async () => {
      const timestamp = getTimestamp();
      const nonce = generateNonce();
      const url = "https://api.example.com/data";

      // Sign the request
      const signature = await signRequestServerSide(
        "GET",
        url,
        timestamp,
        nonce,
        mockHmacSecret
      );

      // Create headers
      const headers = new Headers({
        "X-Request-Timestamp": timestamp.toString(),
        "X-Request-Nonce": nonce,
        "X-Request-Signature": signature,
      });

      const result = await validateRequestSignature("GET", url, headers);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject missing signature headers", async () => {
      const headers = new Headers();

      const result = await validateRequestSignature(
        "GET",
        "https://api.example.com/data",
        headers
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing signature headers");
    });

    it("should reject expired timestamp", async () => {
      const timestamp = getTimestamp() - 400; // 6.67 minutes ago
      const nonce = generateNonce();
      const url = "https://api.example.com/data";

      const signature = await signRequestServerSide(
        "GET",
        url,
        timestamp,
        nonce,
        mockHmacSecret
      );

      const headers = new Headers({
        "X-Request-Timestamp": timestamp.toString(),
        "X-Request-Nonce": nonce,
        "X-Request-Signature": signature,
      });

      const result = await validateRequestSignature("GET", url, headers);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("timestamp");
    });

    it("should reject replay attack (reused nonce)", async () => {
      const timestamp = getTimestamp();
      const nonce = "replay-nonce";
      const url = "https://api.example.com/data";

      const signature = await signRequestServerSide(
        "GET",
        url,
        timestamp,
        nonce,
        mockHmacSecret
      );

      const headers = new Headers({
        "X-Request-Timestamp": timestamp.toString(),
        "X-Request-Nonce": nonce,
        "X-Request-Signature": signature,
      });

      // First request should succeed
      const result1 = await validateRequestSignature("GET", url, headers);
      expect(result1.valid).toBe(true);

      // Second request with same nonce should fail
      const result2 = await validateRequestSignature("GET", url, headers);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain("already used");
    });

    it("should reject invalid signature", async () => {
      const timestamp = getTimestamp();
      const nonce = generateNonce();
      const url = "https://api.example.com/data";

      const headers = new Headers({
        "X-Request-Timestamp": timestamp.toString(),
        "X-Request-Nonce": nonce,
        "X-Request-Signature": "invalid-signature-12345",
      });

      const result = await validateRequestSignature("GET", url, headers);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("edge cases", () => {
    it("should handle empty URL", async () => {
      const result = await validateRequestSignature(
        "GET",
        "",
        new Headers({
          "X-Request-Timestamp": getTimestamp().toString(),
          "X-Request-Nonce": generateNonce(),
          "X-Request-Signature": "test",
        })
      );

      expect(result.valid).toBe(false);
    });

    it("should handle malformed timestamp", async () => {
      const headers = new Headers({
        "X-Request-Timestamp": "not-a-number",
        "X-Request-Nonce": generateNonce(),
        "X-Request-Signature": "test",
      });

      const result = await validateRequestSignature(
        "GET",
        "https://api.example.com/data",
        headers
      );

      expect(result.valid).toBe(false);
    });

    it("should handle different HTTP methods", async () => {
      const methods = ["GET", "POST", "PUT", "DELETE"];

      for (const method of methods) {
        const payload = createSignaturePayload(
          method,
          "https://api.example.com/data",
          getTimestamp(),
          "nonce"
        );

        expect(payload).toContain(method);
      }
    });
  });
});
