# Convex Development Workflows

Common Convex workflows for local development. This project uses Convex for backend state (sessions, invoices, credits, images).

---

## Starting Development

Run both the Next.js dev server and Convex dev server:

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Convex (watches for changes, syncs functions)
npx convex dev
```

The Convex dev server:
- Watches `convex/*.ts` for changes
- Auto-deploys functions to your dev deployment
- Shows real-time logs in the terminal

---

## Environment Variables

Convex has its own environment separate from Next.js (`.env.local`). Some variables must exist in both.

### View current Convex env vars
```bash
npx convex env list
```

### Set a Convex env var
```bash
npx convex env set VARIABLE_NAME "value"
```

### Remove a Convex env var
```bash
npx convex env unset VARIABLE_NAME
```

### Required Convex env vars for this project

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD_SECRET` | Server-side validation for admin session upgrade |

---

## Schema Changes

When modifying `convex/schema.ts`:

1. Edit the schema file
2. `npx convex dev` auto-syncs the changes
3. For breaking changes, you may need to:
   - Clear data in the dashboard, or
   - Write a migration

```bash
# Schema is in:
convex/schema.ts
```

---

## Testing Convex Functions

Tests live alongside Convex functions:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

Test files:
- `convex/sessions.test.ts` - Session and credit ledger tests

---

## Deployment

### Deploy to production
```bash
npx convex deploy
```

### Deploy with env vars (first time or after adding new vars)
```bash
npx convex deploy
npx convex env set ADMIN_PASSWORD_SECRET "your-production-value"
```

---

## Dashboard Access

The Convex dashboard provides:
- Real-time function logs
- Data browser (view/edit tables)
- Deployment settings
- Environment variable management

Access via:
```bash
npx convex dashboard
```

Or visit: https://dashboard.convex.dev

---

## Common Troubleshooting

### "Unauthorized" errors from Convex actions
Check that required env vars are set in Convex (not just `.env.local`):
```bash
npx convex env list
```

### Functions not updating
Ensure `npx convex dev` is running and watching for changes.

### Schema validation errors
Check the Convex dev terminal for specific error messages. May need to clear data or write a migration for breaking changes.

---

## Project-Specific Notes

### Convex Files
```
convex/
  _generated/     # Auto-generated types (don't edit)
  schema.ts       # Database schema
  sessions.ts     # Session & credit mutations/queries
  invoices.ts     # Invoice mutations/queries
  modelStats.ts   # Generation timing stats
  verseImages.ts  # Image storage
  sessions.test.ts # Unit tests
```

### Next.js Integration
- Server-side client: `src/lib/convex-client.ts`
- API routes call Convex mutations/queries directly
- No client-side Convex provider (all server-side)
