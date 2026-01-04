/**
 * LND REST client for Voltage.
 * Uses invoice-only macaroon for creating and looking up invoices.
 */

// LND REST API response types
export interface LndInvoiceResponse {
  r_hash: string; // base64 encoded payment hash
  payment_request: string; // bolt11 invoice string
  add_index: string; // invoice index
  payment_addr: string; // base64 encoded payment address
}

export interface LndInvoiceLookup {
  memo: string;
  r_preimage: string; // base64 encoded preimage
  r_hash: string; // base64 encoded payment hash
  value: string; // invoice amount in sats
  value_msat: string;
  settled: boolean;
  creation_date: string; // unix timestamp
  settle_date: string; // unix timestamp (0 if not settled)
  payment_request: string;
  expiry: string; // seconds until expiry
  state: "OPEN" | "SETTLED" | "CANCELED" | "ACCEPTED";
  amt_paid_sat: string;
  amt_paid_msat: string;
}

class LndError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "LndError";
  }
}

function getLndConfig() {
  const host = process.env.LND_HOST;
  const macaroon = process.env.LND_INVOICE_MACAROON;

  if (!host || !macaroon) {
    // Don't expose which config is missing
    console.error("[LND] Missing required configuration");
    throw new LndError("Lightning payments not configured");
  }

  return { host, macaroon };
}

/**
 * Create a Lightning invoice via LND REST API.
 * @param amountSats - Invoice amount in satoshis
 * @param memo - Invoice description/memo
 * @returns LND invoice response with bolt11 and payment hash
 */
export async function createLndInvoice(
  amountSats: number,
  memo: string
): Promise<LndInvoiceResponse> {
  const { host, macaroon } = getLndConfig();

  const response = await fetch(`https://${host}/v1/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Grpc-Metadata-macaroon": macaroon,
    },
    body: JSON.stringify({
      value: amountSats.toString(),
      memo,
      expiry: "900", // 15 minutes
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    // Log full error server-side for debugging, but don't expose to callers
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("[LND] Invoice creation failed:", response.status, errorText);
    throw new LndError("Invoice creation failed", response.status);
  }

  const data: LndInvoiceResponse = await response.json();
  return data;
}

/**
 * Look up an invoice by payment hash.
 * @param rHash - Payment hash (accepts hex, hex with 0x prefix, or base64)
 * @returns Invoice details including settlement status
 */
export async function lookupLndInvoice(
  rHash: string
): Promise<LndInvoiceLookup> {
  const { host, macaroon } = getLndConfig();

  // Sanitize the r_hash - handle various input formats
  let hexHash = rHash;

  // Strip "0x" prefix if present
  if (hexHash.startsWith("0x") || hexHash.startsWith("0X")) {
    hexHash = hexHash.slice(2);
  }

  // Check if it's valid hex (only 0-9, a-f, A-F)
  // LND returns r_hash as base64, but we should have converted to hex on storage
  // If it's not hex, assume it's base64 and convert
  const isHex = /^[0-9a-fA-F]+$/.test(hexHash);
  if (!isHex) {
    // Assume it's base64, convert to hex
    hexHash = Buffer.from(rHash, "base64").toString("hex");
  }

  // LND expects the r_hash as a URL-safe base64 string in the path
  // Convert hex to bytes, then to base64url
  const bytes = Buffer.from(hexHash, "hex");
  const rHashBase64Url = bytes.toString("base64url");

  const response = await fetch(
    `https://${host}/v1/invoice/${rHashBase64Url}`,
    {
      method: "GET",
      headers: {
        "Grpc-Metadata-macaroon": macaroon,
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    // Log full error server-side for debugging, but don't expose to callers
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("[LND] Invoice lookup failed:", response.status, errorText);
    throw new LndError("Invoice lookup failed", response.status);
  }

  const data: LndInvoiceLookup = await response.json();
  return data;
}

/**
 * Convert base64 string to hex string.
 */
export function base64ToHex(base64: string): string {
  return Buffer.from(base64, "base64").toString("hex");
}

/**
 * Check if LND is configured and available.
 */
export function isLndConfigured(): boolean {
  return !!(process.env.LND_HOST && process.env.LND_INVOICE_MACAROON);
}
