# Security Architecture - FinBoard

## Overview

FinBoard implements a robust client-side encryption architecture to protect sensitive API keys and tokens. This ensures that secrets are encrypted before leaving the browser and only decrypted on the server side when making authenticated requests to external APIs.

## Architecture Diagram

![Security Architecture](./public/img/security-architecture.png)

## Security Flow

### 1. User Input (Client Side)
- User enters API key in plain text (e.g., `sk-live-abc123...`)
- Supports multiple key formats:
  - Header-based: `X-Api-Key`, `Authorization`, `Bearer Token`
  - Query parameter: `apiKey`, `token`, `api_key`, etc.

### 2. Client-Side Encryption
- **Location**: `src/utils/encryptionMiddleware.ts`
- **Technology**: RSA-OAEP with SHA-256 (Web Crypto API)
- **Process**:
  1. Detects API keys from headers or URL parameters
  2. Encrypts the key using RSA public key (2048-bit)
  3. Converts encrypted data to Base64 format
  4. Returns encrypted payload: `KH6pZ...`

### 3. Request Signing (Replay Attack Prevention
- **Location**: `src/utils/requestSigning.ts`
- **Technology**: HMAC-SHA256
- **Process**:
  1. Generates unique nonce (UUID or random hex)
  2. Creates timestamp (current time in seconds)
  3. Creates canonical payload: `METHOD\nURL\nTIMESTAMP\nNONCE\nBODY`
  4. Signs payload with HMAC-SHA256 using shared secret
  5. Adds signature headers:
     - `X-Request-Timestamp`: Unix timestamp
     - `X-Request-Nonce`: Unique request identifier
     - `X-Request-Signature`: HMAC signature
- **Protection**: Prevents replay attacks, ensures request integrity

### 4. Secure Storage
- **Storage**: Browser's `localStorage`
- **Key**: `finboard_encrypted_secrets`
- **Format**:
  ```typescript
  {
    widgetId: string;
    encrypted: string;      // Base64 encrypted payload
    keyName: string;        // Original key name (e.g., 'x-api-key')
    timestamp: number;      // For automatic cleanup
  }
  ```
- **Security Features**:
  - Only encrypted data is stored
  - Automatic cleanup of secrets older than 30 days
  - Per-widget secret management

### 5. API Request (Client → Server)
- **Endpoint**: `POST /api/proxy`
- **Headers**:
  ```
  X-Encrypted-Secret: <base64-encrypted-payload>
  X-Secret-Key-Name: <original-key-name>
  X-Request-Timestamp: <unix-timestamp>
  X-Request-Nonce: <unique-nonce>
  X-Request-Signature: <hmac-signature>
  Content-Type: application/json
  ```
- **Query Params**: `?url=<target-api-url>`

### 6. Server-Side Validation
- **Location**: `app/api/proxy/route.ts` & `src/utils/requestSigning.ts`
- **Technology**: HMAC-SHA256 signature validation
- **Process**:
  1. **Signature Validation**:
     - Extracts timestamp, nonce, and signature from headers
     - Validates timestamp is within 5-minute window
     - Checks nonce hasn't been used (replay attack prevention)
     - Recreates signature using shared HMAC secret
     - Performs constant-time comparison to prevent timing attacks
  2. **Request Rejection**: If validation fails, returns 401 Unauthorized
  3. **Nonce Tracking**: Marks nonce as used in memory cache

### 7. Server-Side Decryption
- **Location**: `src/utils/decryptionMiddleware.ts`
- **Technology**: RSA-OAEP with SHA-256 (Node.js crypto)
- **Process**:
  1. Extracts `X-Encrypted-Secret` and `X-Secret-Key-Name` headers
  2. Decrypts payload using RSA private key (server-side only)
  3. Prepares headers for upstream API request
  4. Handles both header and query parameter authentication

### 8. Upstream API Call
- **Security**: Decrypted key used only in memory
- **Headers**: Properly formatted based on API requirements
  - `Authorization: Bearer <token>` for OAuth/JWT
  - `X-Api-Key: <key>` for API key authentication
  - Query params: `?apiKey=<key>` for URL-based auth
- **Cleanup**: Decrypted key discarded after request

### 9. Response Flow
- Server receives response from target API
- Forwards response data to client (JSON)
- Adds rate limiting headers
- No secrets included in response

## Key Components

### Client-Side Request Signing (`src/utils/requestSigning.ts`)

#### Core Functions

**`generateNonce(): string`**
- Generates unique request identifier
- Uses crypto.randomUUID() or random hex
- Prevents replay attacks

**`signRequest(method, url, timestamp, nonce, secret, body?): Promise<string>`**
- Creates canonical payload from request parameters
- Signs using HMAC-SHA256 with shared secret
- Returns hex-encoded signature

**`addSignatureHeaders(method, url, headers, body?): Promise<Record<string, string>>`**
- Adds all required signature headers to request
- Includes timestamp, nonce, and signature
- Transparent integration with existing headers

**`validateTimestamp(timestamp, windowSeconds): boolean`**
- Validates timestamp is within acceptable window (default: 5 minutes)
- Prevents replay of old requests
- Handles clock skew

### Client-Side Encryption (`src/utils/encryptionMiddleware.ts`)

#### Core Functions

**`encryptWithPublicKey(data: string): Promise<string>`**
- Encrypts data using RSA public key
- Uses Web Crypto API for browser compatibility
- Returns Base64-encoded encrypted string

**`encryptWidgetSecrets(widgetId, headers, apiUrl)`**
- Detects API keys from headers/URL
- Encrypts and stores in localStorage
- Returns encrypted payload and key name

**`prepareProxyHeaders(widgetId, originalHeaders)`**
- Retrieves encrypted secret from storage
- Adds `X-Encrypted-Secret` and `X-Secret-Key-Name` headers
- Removes plain-text API keys from headers

**`detectApiKey(headers, url)`**
- Intelligently detects API keys from various sources
- Supports common naming conventions:
  - `apiKey`, `api_key`, `apikey`
  - `token`, `access_token`, `accessToken`
  - `authorization`, `auth`, `bearer`
  - `x-api-key`, `x-api-token`, `x-auth-token`

### Server-Side (`src/utils/decryptionMiddleware.ts`)

#### Core Functions

**`decryptWithPrivateKey(encryptedData: string): string`**
- Decrypts Base64-encoded data using RSA private key
- Only runs on server (Node.js crypto)
- Never exposes private key to client

**`extractAndDecryptSecret(headers: Headers)`**
- Extracts encrypted secret from request headers
- Decrypts and returns key name + value
- Handles errors gracefully

**`prepareUpstreamHeaders(requestHeaders)`**
- Decrypts secrets from request
- Formats headers for target API
- Handles Authorization bearer tokens
- Falls back to direct headers if no encryption

**`addSecretToUrl(url, requestHeaders)`**
- Adds decrypted secrets to URL query params
- Used for APIs requiring key in URL
- Detects key type automatically

## Security Measures

### 1. RSA Encryption
- **Key Size**: 2048-bit RSA keys
- **Padding**: OAEP with SHA-256
- **Algorithm**: RSA-OAEP-256
- **Strength**: Industry-standard encryption

### 2. Key Management
- **Public Key**: Exposed via environment variable (`NEXT_PUBLIC_RSA_PUBLIC_KEY`)
- **Private Key**: Server-only environment variable (`RSA_PRIVATE_KEY`)
- **Separation**: Private key never sent to client
- **Rotation**: Keys can be regenerated and updated

### 3. Storage Security
- Only encrypted data in localStorage
- Automatic cleanup of old secrets (30 days)
- Per-widget isolation
- No plain-text storage

### 4. Transport Security
- HTTPS required in production
- Encrypted payloads in transit
- No secrets in URL query strings
- Request signing with HMAC-SHA256
- Timestamp validation (5-minute window)
- Nonce-based replay attack prevention
- Rate limiting on proxy endpoint

### 5. Server-Side Protection
- Private key in environment variables only
- Memory-only decryption (no disk storage)
- Secrets discarded after use
- Signature validation before processing
- Constant-time signature comparison
- Nonce cache to prevent replay attacks
- Comprehensive error handling

### 6. Replay Attack Prevention
- **HMAC Signing**: Every request signed with shared secret
- **Timestamp Validation**: Requests expire after 5 minutes
- **Nonce Tracking**: Each nonce can only be used once
- **Constant-Time Comparison**: Prevents timing attacks
- **Memory Cache**: Server tracks used nonces (5-minute TTL)

### 7. Rate Limiting
- **Client-side**: Prevents excessive requests
- **Server-side**: 60 requests per minute per domain
- **Per-IP**: Rate limiting by client IP
- **Upstream**: Respects API provider limits

## Edge Cases Handled

### 1. Different Key Naming Conventions
✅ Supports multiple naming patterns:
- Headers: `X-Api-Key`, `Authorization`, `Bearer`, `X-Auth-Token`
- Query: `apiKey`, `api_key`, `token`, `access_token`, `key`

### 2. Key Location Variations
✅ Detects keys in:
- HTTP headers
- URL query parameters
- Authorization header with/without "Bearer " prefix

### 3. Missing Encryption
✅ Fallback behavior:
- Works without encryption for public APIs
- Graceful degradation if encryption fails
- Direct header passthrough when no secrets detected

### 4. Key Rotation
✅ Supports key updates:
- Old encrypted secrets remain valid temporarily
- Can regenerate RSA keys
- Update `.env` and redeploy

### 5. Browser Compatibility
✅ Uses standard Web Crypto API:
- Modern browser support
- Fallback error messages for older browsers
- Progressive enhancement

### 6. Multi-widget Management
✅ Per-widget secret storage:
- Each widget has own encrypted secret
- Independent key management
- Automatic cleanup on widget deletion

### 7. Replay Attack Protection
✅ Request signing prevents replay:
- Timestamp validation (5-minute window)
- One-time nonce usage enforced
- HMAC signature validation
- Constant-time comparison prevents timing attacks

## Environment Setup

### 1. Generate RSA Keys

```bash
node -e "const crypto = require('crypto'); const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); console.log('NEXT_PUBLIC_RSA_PUBLIC_KEY=', publicKey); console.log('RSA_PRIVATE_KEY=', privateKey);"
```

### 2. Generate HMAC Secret

```bash
node -e "console.log('HMAC_SECRET=\"' + require('crypto').randomBytes(32).toString('hex') + '\"')"
```

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
# Public key (exposed to client)
NEXT_PUBLIC_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...your public key...
-----END PUBLIC KEY-----"

# Private key (server-side ONLY)
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your private key...
-----END PRIVATE KEY-----"

# HMAC Secret for request signing (both client and server)
NEXT_PUBLIC_HMAC_SECRET="your-generated-hmac-secret-hex"
HMAC_SECRET="your-generated-hmac-secret-hex"
```

### 4. Deployment Checklist

- [ ] Generate unique RSA keys for production
- [ ] Generate unique HMAC secret for production
- [ ] Add RSA keys to deployment environment variables
- [ ] Add HMAC secret to deployment environment variables (both NEXT_PUBLIC and server-side)
- [ ] Never commit private key or HMAC secret to version control
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Monitor for security issues
- [ ] Rotate HMAC secret periodically (recommended: quarterly)

## Usage Examples

### Example 1: API Key in Header

```typescript
// User configures widget with header
const headers = {
  "X-Api-Key": "sk-live-abc123xyz789"
};

// Automatic encryption on save
await encryptWidgetSecrets(widgetId, headers);

// Encrypted request to proxy
fetch('/api/proxy?url=https://api.example.com/data', {
  headers: {
    'X-Encrypted-Secret': 'KH6pZ...',  // Encrypted
    'X-Secret-Key-Name': 'X-Api-Key'
  }
});

// Server decrypts and forwards
fetch('https://api.example.com/data', {
  headers: {
    'X-Api-Key': 'sk-live-abc123xyz789'  // Decrypted
  }
});
```

### Example 2: Bearer Token

```typescript
// User configures OAuth token
const headers = {
  "Authorization": "Bearer eyJhbGciOiJIUzI1..."
};

// Automatic detection and encryption
await encryptWidgetSecrets(widgetId, headers);

// Server forwards with Bearer prefix
fetch('https://api.example.com/data', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1...'
  }
});
```

### Example 3: Query Parameter API Key

```typescript
// User provides URL with API key
const apiUrl = "https://api.example.com/data?apiKey=abc123";

// Detected and encrypted
await encryptWidgetSecrets(widgetId, {}, apiUrl);

// Server adds to URL
const finalUrl = addSecretToUrl(targetUrl, headers);
// Result: https://api.example.com/data?apiKey=abc123
```

## Security Best Practices

### For Developers

1. **Never log decrypted secrets**
   ```typescript
   ❌ console.log('API Key:', decryptedKey);
   ✅ logger.debug('API Key present', { keyLength: decryptedKey.length });
   ```

2. **Always validate encryption success**
   ```typescript
   try {
     await encryptWidgetSecrets(widgetId, headers);
   } catch (error) {
     // Handle encryption failure
     showError('Failed to secure API key');
   }
   ```

3. **Use environment variables**
   ```typescript
   ❌ const privateKey = "-----BEGIN PRIVATE...";
   ✅ const privateKey = process.env.RSA_PRIVATE_KEY;
   ```

4. **Implement rate limiting**
   ```typescript
   // Already implemented in proxy route
   checkRateLimit(clientIp, 60, 60000);
   ```

### For Users

1. **Secure API key storage**
   - Keys are encrypted automatically
   - Clear browser data to remove all keys
   - Use widget delete to remove specific keys

2. **Key rotation**
   - Rotate API keys regularly
   - Update widget configuration when keys change
   - Old encrypted keys become invalid

3. **Monitor usage**
   - Check rate limit headers in responses
   - Monitor for unusual activity
   - Revoke compromised keys immediately

## Troubleshooting

### Issue: Encryption fails

**Symptom**: Error "Encryption failed" when adding widget

**Solutions**:
1. Check if `NEXT_PUBLIC_RSA_PUBLIC_KEY` is set
2. Verify key format (PEM with headers/footers)
3. Check browser console for detailed errors
4. Ensure browser supports Web Crypto API

### Issue: Decryption fails on server

**Symptom**: 400 error "Failed to process authentication"

**Solutions**:
1. Verify `RSA_PRIVATE_KEY` is set on server
2. Ensure key pair matches (same generation)
3. Check environment variable formatting
4. Restart server after env changes

### Issue: API returns 401 Unauthorized

**Symptom**: Authentication fails with upstream API

**Solutions**:
1. Test API key directly (without encryption)
2. Check key format required by API
3. Verify header name is correct
4. Check if Bearer prefix is needed
5. Confirm API key is active/valid

## Future Enhancements

- [ ] Support for multiple key encryption algorithms
- [ ] Key rotation without service interruption
- [ ] Encrypted backup/export of configurations
- [ ] Hardware security module (HSM) integration
- [ ] Certificate pinning for API endpoints
- [ ] Audit logging for key access

## References

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [RSA-OAEP Specification](https://tools.ietf.org/html/rfc8017)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## License

This security implementation is part of FinBoard and follows the same license terms.

---

**Last Updated**: December 13, 2025  
**Version**: 1.0.0
