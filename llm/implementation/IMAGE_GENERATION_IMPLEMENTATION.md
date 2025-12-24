# Image Generation Implementation Guide

This document describes the current image generation implementation. It is intentionally high-level and will evolve.

---

## Architecture Overview

Vibible generates AI illustrations for each scripture verse using OpenRouter with Google's Gemini model.

- Each verse page passes its text and chapter theme to the `HeroImage` component.
- Client fetches `/api/generate-image?text={verse}&theme={theme JSON}`.
- Server builds an enhanced prompt combining verse text with theme context.
- Server generates an image via OpenRouter (Gemini) and returns the URL or base64 data.
- Browser caching controls regeneration behavior per-verse.

---

## Chapter Theme System

### Theme Data Structure

Themes are defined per-chapter in the data files:

```ts
// src/data/genesis-1.ts
export const genesis1Theme = {
  setting: "Creation of the cosmos",
  palette: "deep cosmic blues, radiant golds, ethereal whites",
  elements: "primordial void, divine light rays, swirling waters, emerging forms",
  style: "classical religious art, Baroque lighting, majestic and reverent",
};
```

### Theme Interface

```ts
interface ChapterTheme {
  setting: string;   // Scene/context description
  palette: string;   // Color palette guidance
  elements: string;  // Recurring visual elements
  style: string;     // Artistic style direction
}
```

### Purpose

Themes ensure visual consistency across all verses in a chapter:
- Same color palette throughout
- Recurring visual motifs
- Unified artistic style
- Coherent narrative progression

---

## Client Flow

### UI Entry Point

- `src/components/hero-image.tsx` (hero image display and fetch logic)

### Component Props

```tsx
interface HeroImageProps {
  alt?: string;
  caption?: string;
  verseText?: string;      // The verse text to generate an image for
  chapterTheme?: ChapterTheme;  // Theme for visual consistency
}
```

### Component State

Three state variables manage the UI:

```tsx
const [imageUrl, setImageUrl] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### Fetch Trigger

- `useEffect` with `[verseText, chapterTheme]` dependencies triggers fetch when either changes.
- Builds URL with query params for both text and theme.
- Uses `AbortController` for cleanup on unmount or prop change.

```tsx
useEffect(() => {
  const abortController = new AbortController();

  async function generateImage() {
    const params = new URLSearchParams();
    if (verseText) params.set("text", verseText);
    if (chapterTheme) params.set("theme", JSON.stringify(chapterTheme));
    const url = `/api/generate-image${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await fetch(url, { signal: abortController.signal });
    // ...
  }

  generateImage();
  return () => abortController.abort();
}, [verseText, chapterTheme]);
```

### Placeholder UI

While loading or on error, a gradient placeholder is shown:

- Warm gradient background (amber/orange/rose)
- Decorative blur element simulating light
- Loading text: "Generating image..."
- Error text in red if generation fails

### Image Display

- Uses native `<img>` tag (not Next.js Image, for external URLs and data URLs)
- `object-cover` fills the container
- Aspect ratio: 16:9 mobile, 21:9 desktop
- Caption overlay at bottom with verse text

---

## Server Flow

### API Endpoint

- `src/app/api/generate-image/route.ts` handles GET requests.

### Next.js Caching

```ts
export const dynamic = 'force-dynamic';
```

This disables Next.js server-side caching so the browser cache has full control.

### OpenRouter Client Setup

```ts
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_REFERRER || "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_TITLE || "vibible",
  },
});
```

Uses the OpenAI SDK with OpenRouter's base URL for compatibility.

### Query Parameter Handling

```ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const verseText = searchParams.get("text") || DEFAULT_TEXT;
  const themeParam = searchParams.get("theme");
  // ...
}
```

- Reads `text` param for verse content
- Reads `theme` param as JSON string
- Falls back gracefully if either is missing

### Prompt Building

The API builds different prompts based on whether a theme is provided:

**With theme (enhanced prompt):**
```ts
if (themeParam) {
  const theme = JSON.parse(themeParam);
  prompt = `Biblical illustration: ${verseText}

Setting: ${theme.setting}
Visual elements: ${theme.elements}
Color palette: ${theme.palette}
Style: ${theme.style}`;
}
```

**Without theme (fallback):**
```ts
prompt = `Biblical illustration: ${verseText}. Style: classical religious art, ethereal lighting, majestic`;
```

### Image Generation Call

```ts
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-image-preview",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  }),
});
```

- **Provider**: OpenRouter (chat completions endpoint with image modality)
- **Model**: `google/gemini-2.5-flash-image-preview`
- **Pricing**: ~$0.30/M input tokens, ~$2.50/M output tokens
- **Prompt**: Verse text + theme context

### Response Handling

The API handles both URL and base64 responses:

```ts
const imageUrl = response.data?.[0]?.url;
const imageB64 = response.data?.[0]?.b64_json;

if (imageUrl) {
  return NextResponse.json({ imageUrl }, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
} else if (imageB64) {
  return NextResponse.json({
    imageUrl: `data:image/png;base64,${imageB64}`
  }, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
}
```

---

## Caching Implementation

### Browser Cache Strategy

The `Cache-Control: private, max-age=3600` header tells the browser:

- Cache this response privately (not shared/CDN)
- Consider it fresh for 1 hour

### Per-Verse Caching

Each unique URL (including theme) caches separately:

- `/api/generate-image?text=In%20the%20beginning...&theme={...}` → cached image for verse 1
- `/api/generate-image?text=And%20the%20earth...&theme={...}` → cached image for verse 2

### Refresh Behavior

| Action | Browser Behavior | Result |
|--------|------------------|--------|
| Soft refresh (Cmd+R) | Uses cached response | Same image |
| Hard refresh (Cmd+Shift+R) | Bypasses cache | New image generated |
| Navigate to new verse | Different URL | New image (or cached if visited before) |

---

## Verse Page Integration

### Page Component

`src/app/verse/[number]/page.tsx` passes both verse text and theme to HeroImage:

```tsx
import { genesis1Verses, genesis1Theme } from "@/data/genesis-1";

const verse = genesis1Verses[verseNumber - 1];

<HeroImage
  verseText={verse.text}
  caption={verse.text}
  chapterTheme={genesis1Theme}
/>
```

### Data Flow

```
URL: /verse/3
    ↓
Verse page parses number, looks up genesis1Verses[2]
    ↓
Imports genesis1Theme for chapter-level styling
    ↓
Passes verse.text + genesis1Theme to HeroImage
    ↓
HeroImage fetches /api/generate-image?text={verse}&theme={theme JSON}
    ↓
API builds enhanced prompt: verse + setting + elements + palette + style
    ↓
OpenRouter (Gemini) generates image
    ↓
Image URL or base64 returned and displayed
```

---

## Error Handling

### Server Errors

- OpenRouter API failures caught and logged
- Returns `{ error: "Failed to generate image" }` with 500 status
- Missing image data returns `{ error: "No image generated" }`
- Invalid theme JSON falls back to simple prompt

### Client Errors

- Non-OK responses throw and set error state
- AbortError ignored (normal cleanup)
- Error message displayed in placeholder area
- Console logs full error for debugging

---

## Environment Requirements

```bash
OPENROUTER_API_KEY=sk-or-...        # Required
OPENROUTER_REFERRER=http://localhost:3000
OPENROUTER_TITLE=vibible
ENABLE_IMAGE_GENERATION=true        # Set to enable
```

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/data/genesis-1.ts` | Verse data + `genesis1Theme` export |
| `src/app/api/generate-image/route.ts` | API endpoint, OpenRouter client, prompt building |
| `src/components/hero-image.tsx` | Client component, `chapterTheme` prop, fetch logic |
| `src/app/verse/[number]/page.tsx` | Verse page, imports and passes theme |
| `.env.local` | OpenRouter API key configuration |

---

## Adding New Chapter Themes

To add a theme for a new chapter:

1. Create/edit the data file (e.g., `src/data/genesis-2.ts`)
2. Export a theme object:
   ```ts
   export const genesis2Theme = {
     setting: "Description of the chapter's setting",
     palette: "color descriptions",
     elements: "recurring visual elements",
     style: "artistic style guidance",
   };
   ```
3. Import and pass to `HeroImage` in the verse page
