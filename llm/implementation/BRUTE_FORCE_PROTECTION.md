# Admin Login Brute Force Protection

This document describes the brute force protection mechanism for the admin login endpoint.

## Overview

The admin login endpoint (`POST /api/admin-login`) is protected against brute force attacks using a combination of:

1. **Attempt limiting** - Maximum 5 attempts per 15-minute window
2. **Exponential backoff lockouts** - Each lockout doubles in duration
3. **IP-based tracking** - Attempts are tracked by hashed client IP

## How It Works

### Attempt Tracking

```
IP makes login attempt
    │
    ▼
Is IP currently locked out?
    │
    ├─ YES ──► Return 429 with retry-after
    │
    └─ NO ──► Has 15-min window expired since last attempt?
                │
                ├─ YES ──► Reset attempt count to 1
                │
                └─ NO ──► Increment attempt count
                            │
                            └─► Attempt count >= 5?
                                  │
                                  ├─ YES ──► Lock out with exponential backoff
                                  │
                                  └─ NO ──► Allow attempt
```

### Exponential Backoff

Each lockout event increases the lockout duration:

| Lockout # | Duration | Cumulative Time |
|-----------|----------|-----------------|
| 1st | 1 hour | 1 hour |
| 2nd | 2 hours | 3 hours |
| 3rd | 4 hours | 7 hours |
| 4th | 8 hours | 15 hours |
| 5th+ | 24 hours (max) | 39+ hours |

**Formula:** `duration = min(1 hour × 2^lockoutCount, 24 hours)`

### Attack Mitigation

**Before exponential backoff:**
- 5 attempts per 15-min window
- 1 hour lockout
- Window resets after lockout
- Result: ~96 attempts/day possible

**After exponential backoff:**
- Same 5 attempts per window
- Escalating lockouts: 1h → 2h → 4h → 8h → 24h
- lockoutCount persists across windows
- Result: ~15-20 attempts/day maximum

## Database Schema

```typescript
adminLoginAttempts: {
  ipHash: string,        // SHA-256 hash of client IP
  attemptCount: number,  // Failed attempts in current window
  lastAttempt: number,   // Timestamp of last attempt
  lockedUntil?: number,  // Lockout expiration timestamp
  lockoutCount?: number, // Number of times locked out (for backoff)
}
```

## API Responses

### Normal Failure (attempts remaining)
```json
{
  "error": "Invalid credentials"
}
```
Status: 401

### Lockout Triggered
```json
{
  "error": "Too many failed attempts",
  "message": "Account temporarily locked. Please try again later.",
  "retryAfter": 3600
}
```
Status: 429
Headers: `Retry-After: 3600`

### Already Locked Out
```json
{
  "error": "Too many failed attempts",
  "message": "Account temporarily locked. Please try again later.",
  "retryAfter": 7200
}
```
Status: 429

## Cleanup

Admin login attempt records are automatically cleaned up by a daily cron job that removes records older than 24 hours. This:

- Prevents database bloat
- Allows locked-out IPs to eventually retry
- Resets lockoutCount after extended periods

See `convex/cleanup.ts` and `convex/crons.ts`.

## Security Considerations

### IP Spoofing
- Attempts are tracked by IP hash
- IP is determined using trusted proxy configuration
- See `llm/workflow/PROXY_CONFIGURATION.md` for proper setup

### Timing Attacks
- Password comparison uses `crypto.timingSafeEqual()`
- Failed attempts for missing config return same error as wrong password
- Lockout checks happen before password validation

### Distributed Attacks
- Each IP is tracked independently
- Botnet attacks are rate-limited per source IP
- Consider additional Cloudflare/WAF protection for large-scale attacks

## Testing Locally

```bash
# Simulate failed attempts
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/admin-login \
    -H "Content-Type: application/json" \
    -d '{"password": "wrong"}'
  echo ""
done

# Check lockout status (6th attempt should be blocked)
```

## Configuration

No configuration is required. The protection is always enabled with sensible defaults:

- `ADMIN_LOGIN_MAX_ATTEMPTS = 5`
- `ADMIN_LOGIN_WINDOW = 15 minutes`
- `ADMIN_LOGIN_BASE_LOCKOUT_DURATION = 1 hour`
- `ADMIN_LOGIN_MAX_LOCKOUT_DURATION = 24 hours`
