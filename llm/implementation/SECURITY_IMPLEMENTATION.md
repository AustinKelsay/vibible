# Security Implementation Guide

This document describes the security mechanisms protecting API routes from CSRF and unauthorized cross-origin requests.

---

## Entry Points

- `src/lib/origin.ts` - Origin header validation
- `src/lib/csrf.ts` - CSRF token generation and validation (not currently enforced)
- API routes using `validateOrigin()` - invoice, session, admin-login

---

## Origin Validation

**File:** `src/lib/origin.ts`

Origin validation provides defense-in-depth beyond SameSite cookies by checking the HTTP `Origin` header on incoming requests.

### Functions

| Function | Description |
|----------|-------------|
| `validateOrigin(request)` | Returns `true` if origin is valid or same-origin |
| `invalidOriginResponse()` | Returns a 403 JSON response |

### Validation Logic

1. **Same-origin requests** (no Origin header) are always allowed
2. **Same-origin check** - If Origin matches request URL origin, allowed
3. **Allowlist check** - If Origin is in the configured allowlist, allowed
4. Otherwise, returns `false`

### Allowed Origins

```typescript
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Production app URL (from env)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Development only
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
  }

  return origins;
}
```

### Routes Using Origin Validation

| Route | Method | Validation |
|-------|--------|------------|
| `/api/invoice` | POST | Required |
| `/api/invoice/[id]` | GET, POST | Required |
| `/api/session` | POST | Required |
| `/api/admin-login` | POST | Required |
| `/api/generate-image` | GET | Required |
| `/api/chat` | POST | Required |

### Usage Pattern

```typescript
import { validateOrigin, invalidOriginResponse } from "@/lib/origin";

export async function POST(request: Request) {
  // Validate origin first
  if (!validateOrigin(request)) {
    return invalidOriginResponse();
  }

  // ... rest of handler
}
```

---

## CSRF Protection

**File:** `src/lib/csrf.ts`

CSRF protection uses the double-submit cookie pattern. This is a stateless approach that doesn't require server-side token storage.

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CSRF_COOKIE_NAME` | `visibible_csrf` | Cookie storing the token |
| `CSRF_HEADER_NAME` | `x-csrf-token` | Header that must match cookie |

### Functions

| Function | Description |
|----------|-------------|
| `generateCsrfToken()` | Creates 32-byte random hex token |
| `getCsrfCookieOptions(token)` | Returns cookie configuration object |
| `validateCsrfToken(request, cookieToken)` | Validates header matches cookie |

### Cookie Configuration

```typescript
{
  name: CSRF_COOKIE_NAME,
  value: token,
  httpOnly: false,     // Must be readable by JS to send in header
  secure: true,        // HTTPS only in production
  sameSite: "strict",  // Additional CSRF protection
  path: "/",
  maxAge: 3600,        // 1 hour
}
```

### Validation Details

1. Both cookie and header must be present
2. Token lengths must match (prevents timing oracle)
3. Uses `crypto.timingSafeEqual()` for comparison

### Current Status

**CSRF tokens are generated but NOT currently enforced on any routes.**

This infrastructure was pre-built for potential future use. Currently, Origin validation combined with `SameSite=Strict` cookies provides sufficient cross-origin protection for this web-only application. The CSRF module can be wired into routes if the threat model changes (e.g., adding non-browser clients).

---

## Security Layers

The current security model uses multiple layers:

1. **SameSite Cookies** - Session and CSRF cookies use `SameSite=Strict`/`Lax`
2. **Origin Validation** - API routes reject requests from unauthorized origins
3. **Session Binding** - Invoices are scoped to the creating session
4. **Rate Limiting** - Prevents brute force and flooding attacks
5. **Timing-Safe Comparison** - Admin password and CSRF use constant-time comparison

### Missing/Future Considerations

- CSRF token enforcement (infrastructure exists, not enabled)
- Content-Type validation on POST routes
- Request signing for sensitive operations

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Production | Production app URL for origin allowlist |

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/origin.ts` | Origin validation functions |
| `src/lib/csrf.ts` | CSRF token generation and validation |
| `src/app/api/*/route.ts` | Routes implementing origin checks |
