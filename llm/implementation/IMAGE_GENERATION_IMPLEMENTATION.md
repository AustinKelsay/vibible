# Image Generation Implementation Guide

This document describes the current image generation implementation. It is intentionally high-level and will evolve.

---

## Architecture Overview

Vibible generates AI illustrations for each scripture verse using OpenAI's DALL-E API.

- Each verse page passes its text and chapter theme to the `HeroImage` component.
- Client fetches `/api/generate-image?text={verse}&theme={theme JSON}`.
- Server builds an enhanced prompt combining verse text with theme context.
- Server generates an image via DALL-E and returns the temporary URL.
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

- Uses native `<img>` tag (not Next.js Image, for external URLs)
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

### OpenAI Client Setup

```ts
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

Requires `OPENAI_API_KEY` in environment.

### Image Generation Call

```ts
const response = await openai.images.generate({
  model: "dall-e-2",
  prompt,  // Enhanced prompt with theme context
  n: 1,
  size: "1024x1024",
});
```

- **Model**: DALL-E 2
- **Size**: 1024x1024
- **Prompt**: Verse text + theme context

### Response Handling

Success returns JSON with cache header:

```ts
return NextResponse.json({ imageUrl }, {
  headers: {
    'Cache-Control': 'private, max-age=3600',
  },
});
```

Errors return 500 with error message.

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

### Why 1 Hour?

OpenAI's temporary image URLs expire after approximately 1 hour. The cache duration matches this to avoid serving expired URLs.

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
DALL-E generates image with full context
    ↓
Image URL returned and displayed
```

---

## Error Handling

### Server Errors

- OpenAI API failures caught and logged
- Returns `{ error: "Failed to generate image" }` with 500 status
- Missing image URL returns `{ error: "No image generated" }`
- Invalid theme JSON falls back to simple prompt

### Client Errors

- Non-OK responses throw and set error state
- AbortError ignored (normal cleanup)
- Error message displayed in placeholder area
- Console logs full error for debugging

---

## Environment Requirements

```bash
OPENAI_API_KEY=sk-...
ENABLE_IMAGE_GENERATION=true  # Optional flag to enable/disable
```

Must have billing enabled on OpenAI account.

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/data/genesis-1.ts` | Verse data + `genesis1Theme` export |
| `src/app/api/generate-image/route.ts` | API endpoint, theme parsing, prompt building |
| `src/components/hero-image.tsx` | Client component, `chapterTheme` prop, fetch logic |
| `src/app/verse/[number]/page.tsx` | Verse page, imports and passes theme |
| `.env.local` | OpenAI API key configuration |

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
