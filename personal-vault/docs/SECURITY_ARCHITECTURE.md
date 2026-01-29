# Personal Vault - Security Architecture

## Overview

Personal Vault implements a **Zero-Knowledge Architecture** where the server never has access to plaintext user data. All sensitive data is encrypted client-side before transmission.

## Security Principles

1. **Zero-Knowledge**: Server cannot decrypt user data
2. **End-to-End Encryption**: Data encrypted on client, decrypted on client
3. **Defense in Depth**: Multiple layers of security
4. **Minimal Trust**: Don't trust the server with secrets

---

## Cryptographic Design

### Key Hierarchy

```
Master Password (user input)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Argon2id (memory=64MB, iterations=3, parallelism=4)        │
│  Salt: random 16 bytes (stored on server)                    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────┐
│   Master Key (32B)    │──────────────────────────────┐
└───────────────────────┘                              │
        │                                              │
        ▼                                              ▼
┌─────────────────────┐                    ┌─────────────────────┐
│ Auth Key (32B)      │                    │ Encryption Key (32B)│
│ HKDF(master, "auth")│                    │ HKDF(master, "enc") │
└─────────────────────┘                    └─────────────────────┘
        │                                              │
        ▼                                              ▼
  Server Auth                                  Encrypt Vault Data
  (password hash)                              (AES-256-GCM)
```

### Algorithms Used

| Purpose | Algorithm | Parameters |
|---------|-----------|------------|
| Key Derivation | Argon2id | memory=64MB, iterations=3, parallelism=4 |
| Key Expansion | HKDF-SHA256 | - |
| Data Encryption | AES-256-GCM | 96-bit IV, 128-bit tag |
| Password Hashing (Server) | Argon2id | memory=64MB, iterations=3 |
| Token Signing | HMAC-SHA256 | - |

---

## Data Flow Diagrams

### 1. User Registration

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User enters: email + master_password                                     │
│                                                                              │
│  2. Generate random salt (16 bytes)                                          │
│                                                                              │
│  3. Derive Master Key:                                                       │
│     master_key = Argon2id(master_password, salt)                            │
│                                                                              │
│  4. Derive Auth Key and Encryption Key using HKDF:                          │
│     auth_key = HKDF(master_key, "auth")                                     │
│     encryption_key = HKDF(master_key, "enc")                                │
│                                                                              │
│  5. Generate Recovery Key (random 256 bits, encoded as words)               │
│                                                                              │
│  6. Encrypt encryption_key with recovery_key:                               │
│     encrypted_recovery = AES-GCM(recovery_key, encryption_key)              │
│                                                                              │
│  7. Hash auth_key for server verification:                                  │
│     auth_hash = SHA256(auth_key)                                            │
│                                                                              │
│  8. Send to server:                                                          │
│     { email, salt, auth_hash, encrypted_recovery_blob }                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SERVER SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  9. Validate email format                                                    │
│                                                                              │
│  10. Hash auth_hash again for storage:                                       │
│      stored_hash = Argon2id(auth_hash)                                      │
│                                                                              │
│  11. Store in database:                                                      │
│      { email, salt, stored_hash, encrypted_recovery_blob }                  │
│                                                                              │
│  12. Return success + JWT tokens                                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2. User Login

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User enters: email + master_password                                     │
│                                                                              │
│  2. Request salt from server for email                                       │
│                                                                              │
│  3. Derive keys (same as registration):                                      │
│     master_key = Argon2id(master_password, salt)                            │
│     auth_key = HKDF(master_key, "auth")                                     │
│     encryption_key = HKDF(master_key, "enc")                                │
│                                                                              │
│  4. auth_hash = SHA256(auth_key)                                            │
│                                                                              │
│  5. Send to server: { email, auth_hash }                                    │
│                                                                              │
│  6. On success: store encryption_key in memory (never persisted)            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SERVER SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  7. Lookup user by email                                                     │
│                                                                              │
│  8. Verify: Argon2id_verify(stored_hash, auth_hash)                         │
│                                                                              │
│  9. Generate JWT access_token (15 min) + refresh_token (7 days)             │
│                                                                              │
│  10. Store refresh_token hash in database                                    │
│                                                                              │
│  11. Return tokens                                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3. Create/Update Vault Entry

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User creates entry:                                                      │
│     {                                                                        │
│       type: "password",                                                      │
│       title: "Gmail Account",                                                │
│       data: { username: "user@gmail.com", password: "secret123", ... }      │
│     }                                                                        │
│                                                                              │
│  2. Generate random IV (12 bytes)                                            │
│                                                                              │
│  3. Encrypt entry data:                                                      │
│     encrypted_data = AES-256-GCM(encryption_key, IV, JSON(entry.data))      │
│                                                                              │
│  4. Send to server:                                                          │
│     {                                                                        │
│       type: "password",                                                      │
│       encrypted_data: base64(IV + ciphertext + auth_tag),                   │
│       metadata: { created_at, updated_at }  // unencrypted for sorting      │
│     }                                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SERVER SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  5. Validate JWT token                                                       │
│                                                                              │
│  6. Store encrypted blob in database                                         │
│     (server cannot decrypt, only stores opaque data)                        │
│                                                                              │
│  7. Return entry ID                                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4. Read Vault Entries

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Request entries from server (with JWT)                                   │
│                                                                              │
│  4. Receive encrypted entries                                                │
│                                                                              │
│  5. For each entry:                                                          │
│     - Extract IV, ciphertext, auth_tag from encrypted_data                  │
│     - Decrypt: data = AES-256-GCM_decrypt(encryption_key, IV, ciphertext)   │
│     - Verify auth_tag                                                        │
│                                                                              │
│  6. Display decrypted entries to user                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5. Password Recovery

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              RECOVERY FLOW                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User enters recovery_key (saved during registration)                     │
│                                                                              │
│  2. Fetch encrypted_recovery_blob from server                               │
│                                                                              │
│  3. Decrypt: encryption_key = AES-GCM_decrypt(recovery_key, blob)           │
│                                                                              │
│  4. User sets new master_password                                            │
│                                                                              │
│  5. Generate new salt, derive new auth_key                                  │
│                                                                              │
│  6. Re-encrypt recovery blob with new recovery_key                          │
│                                                                              │
│  7. Update server with new auth credentials                                  │
│     (encryption_key stays the same, so existing data remains accessible)    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Measures

### Client-Side

1. **Memory Protection**
   - Encryption key stored only in memory (not localStorage/sessionStorage)
   - Auto-lock after inactivity timeout (default: 5 minutes)
   - Clear sensitive data on tab close/lock

2. **Input Validation**
   - Sanitize all inputs
   - Password strength requirements (min 12 chars, complexity)

3. **Secure Random**
   - Use `crypto.getRandomValues()` for all random generation

### Server-Side

1. **Authentication**
   - JWT with short expiry (15 min access, 7 day refresh)
   - Refresh token rotation (invalidate old token on use)
   - Rate limiting: 5 login attempts per minute per IP

2. **Security Headers**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   Referrer-Policy: strict-origin-when-cross-origin
   ```

3. **Database Security**
   - Encrypted at rest (if using cloud DB)
   - Parameterized queries (prevent SQL injection)
   - Principle of least privilege

4. **Logging**
   - Never log sensitive data
   - Log authentication events (success/failure)
   - Log API access patterns for anomaly detection

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| Server breach | E2EE - data is encrypted, server has no keys |
| Man-in-the-middle | HTTPS + HSTS |
| Brute force login | Rate limiting + Argon2id slow hashing |
| Session hijacking | Short-lived JWTs + refresh rotation |
| XSS | CSP + input sanitization |
| CSRF | SameSite cookies + CSRF tokens |
| SQL injection | Parameterized queries + ORM |

### Limitations

1. **Client compromise**: If user's device is compromised, attacker can access decrypted data
2. **Weak master password**: User must choose strong password
3. **Lost recovery key**: No way to recover data without recovery key

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         users                                │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ email           VARCHAR(255) UNIQUE NOT NULL                │
│ auth_hash       VARCHAR(255) NOT NULL  -- Argon2id hash    │
│ salt            VARCHAR(64) NOT NULL   -- For key derivation│
│ encrypted_recovery_blob  TEXT          -- For password reset│
│ created_at      TIMESTAMP                                   │
│ updated_at      TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       vault_entries                          │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ user_id         UUID REFERENCES users(id)                   │
│ type            VARCHAR(50) NOT NULL  -- password/note/card │
│ encrypted_data  TEXT NOT NULL         -- AES-256-GCM blob   │
│ folder_id       UUID REFERENCES folders(id)                 │
│ created_at      TIMESTAMP                                   │
│ updated_at      TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        folders                               │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ user_id         UUID REFERENCES users(id)                   │
│ encrypted_name  TEXT NOT NULL         -- Encrypted folder name │
│ parent_id       UUID REFERENCES folders(id)                 │
│ created_at      TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     refresh_tokens                           │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ user_id         UUID REFERENCES users(id)                   │
│ token_hash      VARCHAR(255) NOT NULL                       │
│ expires_at      TIMESTAMP NOT NULL                          │
│ created_at      TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

- [ ] Client-side crypto module (AES-GCM, Argon2, HKDF)
- [ ] Secure key management (memory-only storage)
- [ ] Server authentication with double-hashing
- [ ] JWT implementation with refresh rotation
- [ ] Rate limiting middleware
- [ ] Security headers middleware
- [ ] Input validation and sanitization
- [ ] Secure logging (no sensitive data)
- [ ] Auto-lock functionality
- [ ] Recovery key generation and flow
