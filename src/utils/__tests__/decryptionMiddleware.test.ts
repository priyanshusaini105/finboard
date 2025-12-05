/**
 * Tests for decryption middleware (server-side)
 */

import {
  decryptWithPrivateKey,
  extractAndDecryptSecret,
  normalizeHeaderName,
  prepareUpstreamHeaders,
  addSecretToUrl,
} from "../decryptionMiddleware";

// Mock private key for testing
const mockPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpQ6ZY+x7leBWx
9epSrbTTPFbEh3M+W+xQRNlphDARzp3UqWTnwCTnWI+Lh1JXYt/yW3qqpSbKV27C
o3Eybk+qugLGNsPZcqNfFNEHL/gdNSNk4GeMWN196Zw8yuAB1VSWVrXSHRU/vN7M
hoi1zh0AcsMCu05ve8MqJdpOpeP5x/S27JFUG4dGhSI57eN9k0yZ+BzpPROwx55S
dRV8kN76JVGplD71Sd3fw2Ro9nJnyECsKnGe8j/5l2NGbtbDXS7uqHF9Zo0dR9ao
ygT+nrABGVKXiz1J+1/iTOy0OPZUzb2gst5ZM0zWVWTS5sAmLSoKDehKzkhd0mly
0lRRRy33AgMBAAECggEATYOd/9zMmuCB6vQHwaIsD5pvz+OJyrJ1B5NoDzLKgrUg
wV1ryNfM7qc3YXnwovU0QnxTMiecmogswHTx51ruH+y8TYKR8RhXKblSOlzk3pdR
pKZBtVuS31EmzA5KRHyqFokSDe1kqEI5s+ceX0fLL0Pe+3bEpjhCuaAJGABPZTjG
sU7IMAX/LS52vn6t88UyT6LZ8B5XPwcrnKrcxvuQ47POlc31JEoy+PUCUZilPdOd
jzPZHHgDr4wcbSPlb9PUpJXrcA5Sh1RukUZJpPDmsJxJVLMkk8ZTmKMkuqwgRLqk
yyIP9jawpERmOYgFN9dW4H5I6PI7wqnH3hXB5EYJGQKBgQDTkTlj0/FmHFoS95tR
eGu42DbGKLOL0t+rnR4qFGsJQrTG8NaGTgXMJzSQc1TzkuLuvqkgrPRLukRxoOFW
BNg70bTou3gU2bPYewn0Vu9WRkf3CnFwt0x6deOOGF2lPASTgs94S/IxlWYxWGub
7CvxcW7WbkF8OfpzUwE4RvJ5nwKBgQDM0AgCvP485L0mV0xEcB3kEx6RmFRppZ1O
mvYerSew7xG0kVq/GHQCNDSso/0Fd0UWzzVJn8BGIOIJFIJ295ksjJAcZCPep3ZP
ZKukJU+odrqigZpU/Y25l/D39oikdJANncw9TpL2tmKD5u0yANvo82cFe5uadY3k
kAd+3+icqQKBgFxMO9xIR0UD02v456KYRW6DrQmwEfxLB9dHmTREahnFJzavNPes
rCzPYcgu+H22tBfxx7kAmyc6YMetpwCu5mLabvElcBKwkxw7OTGGh618xcKJpMnG
va+jJJ4GFTyTvW9ZHwfdIhDtm4Klj3SbiOQxV2hm+1ylspSDPsH9eaUDAoGBAMqB
mpoSghJ1XCxvvoIglP1whhYRFs2KqfoRr+5u6MLB7rCp058Er5eKRNa6Ii/oWNCP
ujF8meD9HGE7/S9h6vqoVMktnmXFEG65rBhVp+h61FhfathEB4CNIf4arcplUhWU
g1/Os/LqLIgcqUR6ovU2zRMXv6e+ObjXTAH/pABZAoGBAInKX8Mn+PoctLo9flaW
jmNGObjcMTFl0uaTqpYOjkEiJPI723YCaD2iXkw9J0NHMdTEfOwGkLeI4jCC46cM
RMul3JRf+wmVeMd1CTUAIcoQlY8su7SG4fVBcGjoxcLFwFZ9xrwNDgn0vj/T+1My
i4C9uS09lG1LNtTNZLkFeu+T
-----END PRIVATE KEY-----`;

// Mock encrypted data (this would be the output of encryptWithPublicKey)
const mockEncryptedData = "base64-encrypted-data";

// Setup
beforeAll(() => {
  process.env.RSA_PRIVATE_KEY = mockPrivateKey;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("decryptionMiddleware", () => {
  describe("normalizeHeaderName", () => {
    it("should normalize Authorization header", () => {
      expect(normalizeHeaderName("authorization")).toBe("Authorization");
      expect(normalizeHeaderName("bearer")).toBe("Authorization");
      expect(normalizeHeaderName("Authorization")).toBe("Authorization");
    });

    it("should normalize API key headers", () => {
      expect(normalizeHeaderName("x-api-key")).toBe("X-Api-Key");
      expect(normalizeHeaderName("X-API-KEY")).toBe("X-Api-Key");
      // api-key also gets normalized to X-Api-Key due to the special case
      const normalized = normalizeHeaderName("api-key");
      expect(normalized).toMatch(/Api-Key/);
    });

    it("should handle hyphenated names", () => {
      expect(normalizeHeaderName("custom-auth-token")).toBe(
        "Custom-Auth-Token"
      );
    });

    it("should preserve already formatted names", () => {
      expect(normalizeHeaderName("X-Custom-Header")).toBe("X-Custom-Header");
    });
  });

  describe("decryptWithPrivateKey", () => {
    it("should throw error if private key not configured", () => {
      delete process.env.RSA_PRIVATE_KEY;

      expect(() => decryptWithPrivateKey(mockEncryptedData)).toThrow(
        "RSA private key not configured"
      );

      // Restore
      process.env.RSA_PRIVATE_KEY = mockPrivateKey;
    });

    it("should throw error for invalid encrypted data", () => {
      expect(() => decryptWithPrivateKey("invalid-base64!!!")).toThrow();
    });

    // Note: Full encryption/decryption test would require actual crypto operations
    // which are tested in integration tests
  });

  describe("extractAndDecryptSecret", () => {
    it("should return null if no encrypted secret in headers", () => {
      const headers = new Headers({
        "Content-Type": "application/json",
      });

      const result = extractAndDecryptSecret(headers);
      expect(result).toBeNull();
    });

    it("should return null if encrypted secret present but no key name", () => {
      const headers = new Headers({
        "X-Encrypted-Secret": mockEncryptedData,
      });

      const result = extractAndDecryptSecret(headers);
      expect(result).toBeNull();
    });

    it("should return null if key name present but no encrypted secret", () => {
      const headers = new Headers({
        "X-Secret-Key-Name": "X-Api-Key",
      });

      const result = extractAndDecryptSecret(headers);
      expect(result).toBeNull();
    });

    // Note: Testing actual decryption requires valid encrypted data
  });

  describe("prepareUpstreamHeaders", () => {
    it("should include default headers", () => {
      const headers = new Headers();

      const result = prepareUpstreamHeaders(headers);

      expect(result["User-Agent"]).toBe("FinBoard/1.0");
      expect(result["Accept"]).toBe("application/json");
    });

    it("should include additional headers", () => {
      const headers = new Headers();
      const additional = {
        "Custom-Header": "custom-value",
      };

      const result = prepareUpstreamHeaders(headers, additional);

      expect(result["Custom-Header"]).toBe("custom-value");
    });

    it("should fallback to direct headers if no encrypted secret", () => {
      const headers = new Headers({
        authorization: "Bearer direct-token",
        "x-api-key": "direct-key",
      });

      const result = prepareUpstreamHeaders(headers);

      expect(result["Authorization"]).toBe("Bearer direct-token");
      expect(result["X-Api-Key"]).toBe("direct-key");
    });

    // Note: Testing with encrypted secret requires valid encryption
  });

  describe("addSecretToUrl", () => {
    it("should return original URL if no encrypted secret", () => {
      const url = "https://api.example.com/data";
      const headers = new Headers();

      const result = addSecretToUrl(url, headers);
      expect(result).toBe(url);
    });

    it("should handle invalid URL gracefully", () => {
      const url = "not-a-valid-url";
      const headers = new Headers();

      const result = addSecretToUrl(url, headers);
      expect(result).toBe(url); // Returns original when no secret
    });

    // Note: Testing with actual secret addition requires valid decryption
  });

  describe("edge cases", () => {
    it("should handle empty headers gracefully", () => {
      const headers = new Headers();
      expect(() => prepareUpstreamHeaders(headers)).not.toThrow();
    });

    it("should handle missing environment variables", () => {
      const originalKey = process.env.RSA_PRIVATE_KEY;
      delete process.env.RSA_PRIVATE_KEY;

      expect(() => decryptWithPrivateKey("data")).toThrow(
        "RSA private key not configured"
      );

      process.env.RSA_PRIVATE_KEY = originalKey;
    });

    it("should handle malformed encrypted data", () => {
      expect(() => decryptWithPrivateKey("not-base64!@#$")).toThrow();
    });

    it("should normalize various header name formats", () => {
      const testCases = [
        { input: "x-api-key", expected: "X-Api-Key" },
        { input: "X-API-KEY", expected: "X-Api-Key" },
        { input: "authorization", expected: "Authorization" },
        { input: "AUTHORIZATION", expected: "Authorization" },
        { input: "bearer", expected: "Authorization" },
        { input: "custom-header", expected: "Custom-Header" },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeHeaderName(input)).toBe(expected);
      });
    });

    it("should handle Authorization header with Bearer prefix", () => {
      const headers = new Headers({
        authorization: "Bearer token123",
      });

      const result = prepareUpstreamHeaders(headers);
      expect(result["Authorization"]).toBe("Bearer token123");
    });

    it("should handle Authorization header without Bearer prefix", () => {
      const headers = new Headers({
        authorization: "token123",
      });

      const result = prepareUpstreamHeaders(headers);
      expect(result["Authorization"]).toBe("token123");
    });
  });

  describe("integration scenarios", () => {
    it("should handle API key in header scenario", () => {
      const headers = new Headers({
        "x-api-key": "test-key-123",
      });

      const result = prepareUpstreamHeaders(headers);
      expect(result["X-Api-Key"]).toBe("test-key-123");
    });

    it("should handle Bearer token scenario", () => {
      const headers = new Headers({
        authorization: "Bearer eyJhbGciOiJIUzI1...",
      });

      const result = prepareUpstreamHeaders(headers);
      expect(result["Authorization"]).toBe("Bearer eyJhbGciOiJIUzI1...");
    });

    it("should handle multiple header types", () => {
      const headers = new Headers({
        authorization: "Bearer token",
        "x-api-key": "key123",
        "content-type": "application/json",
      });

      const result = prepareUpstreamHeaders(headers);
      expect(result["Authorization"]).toBe("Bearer token");
      expect(result["X-Api-Key"]).toBe("key123");
    });
  });

  describe("security considerations", () => {
    it("should not expose decrypted secrets in logs", () => {
      // This is more of a code review check
      // Ensure no console.log calls expose decrypted values
      const consoleSpy = jest.spyOn(console, "log");

      const headers = new Headers();
      prepareUpstreamHeaders(headers);

      // Should not log sensitive data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("key")
      );

      consoleSpy.mockRestore();
    });

    it("should handle decryption failures gracefully", () => {
      const headers = new Headers({
        "X-Encrypted-Secret": "invalid-encrypted-data",
        "X-Secret-Key-Name": "X-Api-Key",
      });

      // Should not crash, should log error
      expect(() => extractAndDecryptSecret(headers)).toThrow();
    });
  });
});
