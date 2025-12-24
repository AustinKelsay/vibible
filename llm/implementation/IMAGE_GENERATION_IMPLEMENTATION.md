# Image Generation Implementation Guide

This document describes the current image generation implementation. It is intentionally high-level and will evolve.

---

## Architecture Overview

Vibible generates AI illustrations for scripture passages using OpenAI's DALL-E API.

- Client component fetches `/api/generate-image` on mount.
- Server generates an image via DALL-E 2 and returns the temporary URL.
- Browser caching controls regeneration behavior (soft vs hard refresh).

---

## Client Flow

### UI Entry Point

- `src/components/hero-image.tsx` (hero image display and fetch logic)

### Component State

Three state variables manage the UI:

```tsx
const [imageUrl, setImageUrl] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### Fetch Trigger

- `useEffect` with empty dependency array triggers fetch on mount.
- Calls `fetch("/api/generate-image")` and parses JSON response.
- On success, sets `imageUrl`; on failure, sets `error`.

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
- Caption overlay at bottom with scripture quote

---

## Server Flow

### API Endpoint

- `src/app/api/generate-image/route.ts` handles GET requests.

### Next.js Caching

```ts
export const dynamic = 'force-dynamic';
```

This disables Next.js server-side caching so the browser cache has full control.

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
  prompt: `Biblical illustration: ${BIBLE_TEXT}. Style: classical religious art, ethereal lighting, majestic`,
  n: 1,
  size: "512x512",
});
```

- **Model**: DALL-E 2 (cheapest option)
- **Size**: 512x512 (~$0.018 per image)
- **Prompt**: Hardcoded Genesis 1:1-2 text with style suffix

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

### Refresh Behavior

| Action | Browser Behavior | Result |
|--------|------------------|--------|
| Soft refresh (Cmd+R) | Uses cached response | Same image |
| Hard refresh (Cmd+Shift+R) | Bypasses cache | New image generated |
| Navigation within app | Uses cached response | Same image |

### Why 1 Hour?

OpenAI's temporary image URLs expire after approximately 1 hour. The cache duration matches this to avoid serving expired URLs.

---

## Prompt Structure

Currently hardcoded:

```ts
const BIBLE_TEXT = "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep.";
```

Prompt template:

```
Biblical illustration: {scripture text}. Style: classical religious art, ethereal lighting, majestic
```

Future: dynamically inject visible passage text.

---

## Error Handling

### Server Errors

- OpenAI API failures caught and logged
- Returns `{ error: "Failed to generate image" }` with 500 status
- Missing image URL returns `{ error: "No image generated" }`

### Client Errors

- Non-OK responses throw and set error state
- Error message displayed in placeholder area
- Console logs full error for debugging

---

## Environment Requirements

```bash
OPENAI_API_KEY=sk-...
```

Must have billing enabled on OpenAI account.

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/app/api/generate-image/route.ts` | API endpoint, DALL-E call, caching headers |
| `src/components/hero-image.tsx` | Client component, fetch logic, display |
| `.env.local` | OpenAI API key configuration |
