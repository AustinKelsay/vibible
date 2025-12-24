# Image Generation Context

High-level overview of how Vibible generates scripture illustrations. Details may change.

## Overview

- Each page load generates an AI image based on the current scripture passage.
- Images are generated server-side via OpenAI's DALL-E API.
- Browser-level caching controls when new images are generated.

## Current Flow

1. Client component mounts and fetches `/api/generate-image`
2. Server generates image using DALL-E 2 (cheapest model)
3. Response includes `Cache-Control` header for browser caching
4. Generated image URL is displayed in the hero area

## Caching Strategy

Browser cache handles persistence:

- **Soft refresh (Cmd+R)**: Browser serves cached response; no API call
- **Hard refresh (Cmd+Shift+R)**: Browser bypasses cache; new image generated

Server-side Next.js caching is disabled (`dynamic = 'force-dynamic'`) so the browser has full control.

Cache duration is 1 hour (`max-age=3600`), which aligns with OpenAI's temporary URL expiration.

## Prompt Construction

Currently hardcoded to Genesis 1:1-2. Future: dynamically built from visible scripture.

```
Biblical illustration: {scripture text}. Style: classical religious art, ethereal lighting, majestic
```

## Cost Considerations

- Model: DALL-E 2 (cheaper than DALL-E 3)
- Size: 512x512 (~$0.018 per image)
- Caching reduces redundant generation costs

## Entry Points

- API: `src/app/api/generate-image/route.ts`
- UI: `src/components/hero-image.tsx`
