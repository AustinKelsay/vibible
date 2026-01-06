# Proxy Trust Configuration (Implementation)

This document describes how proxy trust is implemented in the codebase.

## Entry points

- `src/lib/session.ts` implements `getClientIp()` and proxy trust evaluation.
- `src/lib/validate-env.ts` validates proxy config at runtime and logs warnings.

## Environment variables

- `TRUST_PROXY_PLATFORM`: currently supports `vercel`.
- `TRUSTED_PROXY_IPS`: comma- or whitespace-separated IPs/CIDRs.

## Trust decision flow

`getClientIp(request)`:
1. Reads the peer IP from `request.ip` (when available).
2. Calls `isTrustedProxy(request, peerIp)`:
   - If `TRUST_PROXY_PLATFORM=vercel` and `VERCEL=1`, trust is enabled.
   - Otherwise, it parses `TRUSTED_PROXY_IPS` and checks if `peerIp` matches any IP/CIDR.
3. If not trusted, returns `peerIp` (or `unknown`).
4. If trusted, checks headers in order:
   - `x-forwarded-for` (first valid IP)
   - `x-real-ip`
   - `cf-connecting-ip`
   - fallback to `peerIp`

## Parsing behavior

- `TRUSTED_PROXY_IPS` accepts both IPv4 and IPv6.
- CIDR entries are validated for proper prefix length (IPv4: 0–32, IPv6: 0–128).
- Invalid entries are ignored.

## Logging and visibility

- When proxy trust is used, `logProxyTrust()` emits a line like:
  `[Proxy] Trusted proxy <proxy> forwarded request for client <client> (via <header>)`
- Logging is only enabled in development or when `DEBUG_PROXY=true`.

## Validation warnings

`validateProxyConfig()` emits warnings at startup for:
- Broad or risky CIDRs (including `0.0.0.0/0` and `::/0`)
- `TRUST_PROXY_PLATFORM=vercel` without `VERCEL=1`
- No proxy trust configured in production

## Related docs

Setup guidance lives in `llm/workflow/PROXY_CONFIGURATION.md`.
