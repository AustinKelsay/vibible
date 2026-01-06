# Lightning Payments Implementation Guide

This document describes how Lightning invoices are created, tracked, and confirmed for credit purchases.

---

## Entry Points

- `src/app/api/invoice/route.ts` - create invoices.
- `src/app/api/invoice/[id]/route.ts` - status + confirmation.
- `src/lib/lnd.ts` - LND REST client (create + lookup).
- `src/lib/btc-price.ts` - BTC/USD price caching.
- `convex/invoices.ts` - persistence + credit grant.

---

## Environment Variables

```env
# Lightning
LND_HOST=your-node.m.voltageapp.io
LND_INVOICE_MACAROON=your-invoice-macaroon-hex

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_SERVER_SECRET=your-secure-random-secret
```

- If LND is not configured, invoice routes return 503.
- If Convex is not configured, invoice routes return 503 with "Payment system not available."
- `CONVEX_SERVER_SECRET` is required for payment confirmation (validates requests come from trusted backend).

---

## Invoice Creation

**Route:** `POST /api/invoice`

**Security checks (in order):**
1. Origin validation (returns 403 if invalid).
2. Convex client availability (returns 503 if unavailable).
3. LND configuration check (returns 503 if not configured).
4. Session cookie required (returns 401 if missing).
5. Rate limiting: 10 invoices per minute per IP+session (returns 429 with `Retry-After` header if exceeded).

**Flow:**
1. Fetches BTC price via `getBtcPrice()` (Coinbase; 5 min cache).
2. Converts `$3` bundle price to sats via `usdToSats()`.
3. Calls `createLndInvoice(amountSats, memo)` with 15-minute expiry.
4. Converts the LND `r_hash` from base64 → hex (`base64ToHex`).
5. Stores the invoice in Convex via `api.invoices.createInvoice`.
6. Returns `invoiceId`, `bolt11`, `amounts`, `expiresAt`, and `credits` (300).

**Stored fields:** `invoiceId`, `sid`, `amountUsd`, `amountSats`, `bolt11`, `paymentHash`, `status`, `createdAt`, `expiresAt`, `paidAt`.

---

## Invoice Status (Polling + Auto-Confirm)

**Route:** `GET /api/invoice/:id`

- Origin validation required (returns 403 if invalid).
- Requires a valid session cookie (returns 401 if missing).
- Verifies the invoice belongs to the current session (`invoice.sid`, returns 403 if mismatch).
- If pending and not expired, checks LND settlement by `paymentHash`:
  - `SETTLED` → **automatically confirms payment** via `confirmPayment` mutation and credits the session.
  - `CANCELED` → expires the invoice.
  - `OPEN`/`ACCEPTED` → remains pending.

Returns invoice details (`status`, `bolt11`, `amounts`, `expiresAt`, `paidAt`).

**Note:** The GET route performs automatic confirmation when LND reports settlement. This allows the polling mechanism to complete the payment flow without requiring a separate POST confirmation call.

---

## Invoice Confirmation

**Route:** `POST /api/invoice/:id`

- Origin validation required.
- Requires session cookie and ownership check.
- Requires `paymentHash` on the invoice and LND configuration.
- Looks up the invoice via LND; only confirms if `SETTLED`.

**Error Codes:**
- `400`: Invoice missing payment hash
- `401`: Missing or invalid session
- `402`: Not settled (payment still pending)
- `403`: Invalid origin or invoice not owned by session
- `404`: Invoice not found
- `410`: Invoice canceled or expired
- `500`: Server error
- `503`: LND or Convex not configured

On success, returns `{ success, alreadyPaid?, newBalance?, creditsAdded? }`.

**Note:** This endpoint does not accept arbitrary confirmation; it only succeeds when LND reports settlement.

---

## Convex Mutations

**`confirmPayment`** (action in `convex/invoices.ts`)

- Validates `serverSecret` against `CONVEX_SERVER_SECRET` (throws "Unauthorized" if invalid).
- Calls internal mutation `confirmPaymentInternal` which:
  - Validates invoice exists and is not expired.
  - Returns early if already paid (idempotent—prevents double-crediting).
  - Sets status to `paid`, `paidAt` timestamp.
  - Updates `paymentHash` only if provided (preserves existing value if omitted).
  - Adds 300 credits to the session.
  - Upgrades session `tier` to `"paid"` (unless already `"admin"`).
  - Inserts a `creditLedger` entry with reason `purchase`.

**`expireInvoice`** (mutation in `convex/invoices.ts`)

- Marks an invoice as expired (called when LND reports `CANCELED` or local expiry exceeded).
- Only updates status if currently `"pending"` (idempotent).
- Sets `status` to `"expired"`.

---

## LND Client

**File:** `src/lib/lnd.ts`

- `createLndInvoice(amountSats, memo)` uses the invoice macaroon.
- `lookupLndInvoice(paymentHash)` checks settlement state.
- Uses 10-second timeouts for LND requests to avoid blocking.

---

## BTC Price Cache

**File:** `src/lib/btc-price.ts`

- Fetches BTC/USD from Coinbase with a 5-second timeout.
- Caches for 5 minutes.
- Falls back to stale cache if the live fetch fails.

---

## Security Notes

- **Origin validation**: All invoice routes validate the HTTP Origin header to prevent CSRF attacks.
- **Session scoping**: Invoice status/confirmation requires matching session ownership.
- **Rate limiting**: Invoice creation is rate-limited (10/min per IP+session) to prevent LND flooding.
- **Server secret**: Payment confirmation requires `CONVEX_SERVER_SECRET` to validate trusted backend calls.
- **Idempotency**: `confirmPayment` safely handles duplicate calls (returns `alreadyPaid: true`).
- **LND verification**: Credits are granted only after LND reports `SETTLED` state.
- **Invoice-only macaroon**: LND authentication uses a restricted macaroon with create/lookup permissions only.
- No refund path is implemented in the current flow.
