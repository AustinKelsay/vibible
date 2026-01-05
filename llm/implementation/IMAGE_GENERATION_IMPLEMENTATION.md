# Image Generation Implementation Guide

This document describes the current image generation implementation, including Convex-backed persistence.

---

## Architecture Overview

Visibible generates AI illustrations per verse using OpenRouter. Users select an image model, and each verse maintains an image history when Convex is enabled.

High-level flow:

- Verse page fetches current verse + prev/next verse context using the selected translation (prev/next only included for same-chapter verses).
- `HeroImage` loads existing images from Convex (if available).
- If no images exist, `HeroImage` auto-generates the first image when generation is allowed.
- New images are generated via `/api/generate-image` and saved to Convex.
- Users can browse older/newer images and generate new ones when credits allow.

---

## Model Selection System

Users can choose from any image generation model available on OpenRouter.

### Type Definitions

```ts
// src/lib/image-models.ts
export interface ImageModel {
  id: string;        // e.g., "google/gemini-2.5-flash-image"
  name: string;      // Human-readable name
  provider: string;  // e.g., "Google", "OpenAI"
  pricing?: { imageOutput?: string };
  creditsCost?: number | null;
  etaSeconds?: number;
}

export const CREDIT_USD = 0.01;
export const PREMIUM_MULTIPLIER = 1.25;
export const DEFAULT_ETA_SECONDS = 12;
export const DEFAULT_CREDITS_COST = 20; // UI fallback for display before pricing loads
export const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";
```

### Models API Endpoint

`src/app/api/image-models/route.ts` fetches and filters OpenRouter models:

- **Requires authentication**: Returns 401 if no valid session cookie
- Filters by `architecture.output_modalities` containing `"image"`
- Drops `-preview` models when a stable counterpart exists
- Computes `creditsCost` from OpenRouter pricing (`CREDIT_USD` + `PREMIUM_MULTIPLIER`)
- Merges ETA from Convex `modelStats` (defaults to 12s)
- Returns a `creditRange` (min/max) for onboarding copy
- Falls back to the default list if the API fails or key is missing

### Preferences Integration

`src/context/preferences-context.tsx` stores the selected model:

- Persisted in `localStorage` (`visibible-preferences`)
- Stored as cookie `visibible-image-model`
- Triggers `router.refresh()` to regenerate the image with the new model

---

## Chapter Theme System (Optional)

Theme support exists but is not currently wired in from the verse page. If provided, themes augment the prompt:

```ts
interface ChapterTheme {
  setting: string;
  palette: string;
  elements: string;
  style: string;
}
```

---

## Client Flow (HeroImage)

### Entry Point

- `src/components/hero-image.tsx`


### Convex Gate

`HeroImage` checks `useConvexEnabled()`:

- If Convex is available, it uses `HeroImageWithConvex`.
- Otherwise it renders `HeroImageBase` with no persistence.

### Convex Integration

```tsx
const imageHistory = useQuery(api.verseImages.getImageHistory, { verseId, refreshToken });
const saveImageAction = useAction(api.verseImages.saveImage);
```

- `verseId` is derived from `currentReference` (e.g., `genesis-1-1`).
- `refreshToken` forces Convex to re-run the query on demand.

### Pricing + Credits Gate

`HeroImage` fetches `/api/image-models` to surface the current model's `creditsCost` and ETA in the UI:

- UI defaults: 20 credits and 12s are used for display before pricing data loads.
- `canGenerate` is true when Convex is disabled, admin tier is active, or paid tier has enough credits **and pricing has loaded**.
- Auto-generation only runs when `canGenerate` is true and the session has loaded.
- **Note**: Unpriced models (`creditsCost === null`) are rejected server-side with a 400 error. The UI disables them in the selector to prevent selection.

#### Pricing Race Condition Prevention

To prevent auto-generation from proceeding before actual model costs are known, `HeroImage` tracks a `pricingLoaded` boolean:

```tsx
const [pricingLoaded, setPricingLoaded] = useState(false);

// In useEffect for pricing fetch:
// - Reset to false when imageModel changes
// - Set to true immediately on cache hit
// - Set to true in finally block after fetch completes (success or error)

const pricingPending = isConvexEnabled && !isAdmin && !pricingLoaded;
const canGenerate = !isConvexEnabled || isAdmin || (pricingLoaded && tier === "paid" && credits >= effectiveCost);
const showCreditsCost = isConvexEnabled && !isAdmin && pricingLoaded;
```

**Why this matters:** Without `pricingLoaded`, the fallback cost (20 credits) would be used before the actual model price is fetched. If a user has 25 credits but selects a 50-credit model, they could:
1. See "Generate" button enabled (because 25 >= 20 fallback)
2. Click generate or trigger auto-generation
3. Get a 402 error from the server (which validates actual cost)

With `pricingLoaded`:
- Generation is blocked until pricing is confirmed
- UI shows "Loading pricing..." state while fetching
- Credits cost and ETA display only after pricing is known
- Server-side validation remains the authoritative check, but client-side UX is consistent

### Unpriced Model Behavior

Models with `creditsCost === null` (no pricing data from OpenRouter) are **disabled in the selector UI**:

```tsx
// src/components/image-model-selector.tsx
onClick={() => model.creditsCost != null && handleSelect(model.id)}
disabled={model.creditsCost == null}
```

This prevents users from selecting models where costs cannot be calculated. Unpriced models appear in the list but are grayed out and unclickable.

### Generation Trigger

Image generation is explicit (manual) and automatic (first image):

- **Auto-generate** when `imageHistory` is loaded and empty **and** generation is allowed.
- **Manual** via the "New image" button.

`generateImage()` builds the request:

```ts
const params = new URLSearchParams();
if (verseText) params.set("text", verseText);
if (chapterTheme) params.set("theme", JSON.stringify(chapterTheme));
if (prevVerse) params.set("prevVerse", JSON.stringify(prevVerse));
if (nextVerse) params.set("nextVerse", JSON.stringify(nextVerse));
if (currentReference) params.set("reference", currentReference);
if (imageModel) params.set("model", imageModel);

const existingImageCount = imageHistory?.length || 0;
if (existingImageCount > 0) {
  params.set("generation", String(existingImageCount + 1));
}
```

The response returns `{ imageUrl, model, prompt, generationId, ...metadata }`.

### Saving to Convex

When Convex is enabled, the image is saved before display:

```ts
const savedId = await onSaveImage({
  verseId,
  imageUrl,
  model,
  prompt,
  promptVersion,
  promptInputs,
  generationId,
  reference,
  verseText,
  chapterTheme,
  generationNumber,
  translationId,
  provider,
  providerRequestId,
  creditsCost,
  costUsd,
  durationMs,
  aspectRatio,
});
setPendingImageId(savedId);
```

The UI waits until the new ID appears in `imageHistory` before switching to it.

Saved metadata includes `translationId` (current translation), `promptVersion`/`promptInputs`, and provider identifiers for traceability.

### History Navigation

- History is sorted newest-first.
- `selectedImageId = null` means "show latest".
- **Older** = move forward in the list.
- **Newer** = move backward.
- Image count label shows `index / total` and "Latest" when on newest.

### Loading + Error States

- `isGenerating` shows a loading overlay.
- `isImageLoading` tracks actual `<img>` load state.
- Image load failures trigger a Convex refresh (up to 3 retries), then an error panel.

---

## Server Flow (`/api/generate-image`)

### API Endpoint

- `src/app/api/generate-image/route.ts`
- `export const dynamic = "force-dynamic"` disables Next.js caching

### Security & Validation

The endpoint enforces multiple security layers:

1. **Origin validation** via `validateOrigin()` - rejects requests from unauthorized origins.
2. **Convex required** - returns 503 if Convex is unavailable (no fallback mode).
3. **Session required** via `getSessionFromCookies()` - returns 401 if missing.
4. **Rate limiting** via `api.rateLimit.checkRateLimit` - returns 429 if exceeded (IP hash + session combo).
5. **Input sanitization** - `sanitizeReference()` and `sanitizeVerseText()` strip control characters and prompt injection patterns.
6. **Model validation** - rejects unknown models (400) and unpriced models (400).

### Credits & Sessions (Reservation Pattern)

The endpoint enforces credits using a two-stage reservation pattern to prevent race conditions:

1. Verify session and resolve model pricing.
2. **Reject unpriced models** - returns 400 if `creditsCost === null`.
3. **Reserve credits atomically** via `reserveCredits()` - deducts from balance immediately and creates a `reservation` ledger entry.
4. If reservation fails (insufficient credits), return 402 with `required`/`available` amounts.
5. Generate image via OpenRouter.
6. **Convert reservation to charge** via `deductCredits()` - uses double-entry bookkeeping (creates `generation` + compensating `refund` to convert the reservation).
7. If generation fails, **release reservation** via `releaseReservation()` to restore credits.
8. If post-charge fails, return 402 and discard the generated image.

**Why reservation?** Prevents over-spending when concurrent requests race. Credits are atomically reserved before the slow OpenRouter call, ensuring the balance check is authoritative.

**Server-side only:** The reservation system is entirely server-side. The client's `useSession()` context only sees the final balance update via `updateCredits()` after generation completes.

### Prompt Building

The API builds a storyboard-aware prompt:

- Verse text + reference
- Optional prev/next verse context
- Optional chapter theme
- Optional generation note (2nd+ images)
- Strict "no text" and framing instructions
- `promptVersion` (date string, e.g., `"2025-12-30"`) + `promptInputs` recorded for reproducibility

`promptInputs` shape:

```ts
{
  reference,
  aspectRatio,
  generationNumber?,
  prevVerse?,
  nextVerse?
}
```

### OpenRouter Call

Uses chat completions with image modality support:

```ts
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${openRouterApiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_REFERRER || "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_TITLE || "visibible",
  },
  body: JSON.stringify({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
    image_config: { aspect_ratio: "16:9" },
  }),
});
```

### Response Handling

- Checks `message.images` first.
- Falls back to `message.content` for `image_url` or inline base64 data.
- `provider` is derived from the model ID; `providerRequestId` uses OpenRouter's response `id`.
- Returns `{ imageUrl, model, provider, providerRequestId, prompt, promptVersion, promptInputs, generationId, creditsCost, costUsd, durationMs, aspectRatio, credits? }` with `Cache-Control: private, max-age=3600`.

### Model Stats (ETA)

After a successful generation, the server records the duration via `api.modelStats.recordGeneration` (fire-and-forget, implemented in `convex/modelStats.ts`). `/api/image-models` merges these stats into per-model `etaSeconds`.

---

## Persistence Layer (Convex)

Convex persistence is documented in detail in:

- `llm/implementation/IMAGE_PERSISTENCE_IMPLEMENTATION.md`

---

## Verse Page Integration

`src/app/[book]/[chapter]/[verse]/page.tsx` provides:

- `verseText` and `caption` (current verse text)
- `prevVerse` and `nextVerse` for storyboard continuity (only when in same chapter)
- `currentReference` (e.g., "Genesis 1:3")
- navigation URLs + counts

---

## Error Handling

### Server

- **400** - Model not available or pricing unavailable (unpriced models rejected).
- **401** - Missing or invalid session.
- **402** - Insufficient credits (returns `required`/`available` amounts).
- **403** - Image generation disabled (`ENABLE_IMAGE_GENERATION=false`) or origin validation failed.
- **429** - Rate limit exceeded (returns `retryAfter` seconds).
- **500** - Missing `OPENROUTER_API_KEY`, OpenRouter API errors, or model doesn't support image output.
- **503** - Convex unavailable (service temporarily unavailable).

### Client

- Non-OK responses surface a user-facing error message.
- AbortError is ignored during unmount or re-generation.
- Image load errors attempt Convex refresh before showing "Try Again".

---

## Environment Requirements

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_REFERRER=http://localhost:3000
OPENROUTER_TITLE=visibible
ENABLE_IMAGE_GENERATION=true
CONVEX_DEPLOYMENT=prod:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
CONVEX_SERVER_SECRET=your-server-secret  # Required for server-side Convex operations
SESSION_SECRET=your-session-secret-here  # Required for credit-gated generation
```

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/lib/image-models.ts` | Type definitions + default model |
| `src/app/api/image-models/route.ts` | Fetch/filter OpenRouter models |
| `src/app/api/generate-image/route.ts` | OpenRouter client + prompt building |
| `src/components/image-model-selector.tsx` | Model selection dropdown |
| `src/components/hero-image.tsx` | Hero image UI + generation flow |
| `src/components/convex-client-provider.tsx` | Convex client gating |
| `convex/verseImages.ts` | Queries/actions for image persistence |
| `convex/schema.ts` | `verseImages` table definition |
| `convex/modelStats.ts` | ETA tracking for image models |
| `src/context/preferences-context.tsx` | User preferences (translation + image model) |
| `src/app/[book]/[chapter]/[verse]/page.tsx` | Verse page wiring |

---

## Adding New Chapter Themes

To add a theme for a new chapter:

1. Create/edit a data file (e.g., `src/data/genesis-2.ts`).
2. Export a theme object:
   ```ts
   export const genesis2Theme = {
     setting: "Description of the chapter's setting",
     palette: "color descriptions",
     elements: "recurring visual elements",
     style: "artistic style guidance",
   };
   ```
3. Pass it to `HeroImage` via the `chapterTheme` prop.
