# Image Generation Context

High-level overview of how Vibible generates scripture illustrations. Details may change.

## Overview

- Each verse has its own AI-generated image.
- Images are generated server-side via OpenRouter using Google's Gemini model.
- Chapter-level themes provide visual consistency across verses within a chapter.
- Browser-level caching ensures each verse's image persists across soft refreshes.

## Current Flow

1. Verse page renders `HeroImage` with verse text and chapter theme
2. Client fetches `/api/generate-image?text={verse}&theme={theme JSON}`
3. Server builds enhanced prompt using verse + theme context
4. Server generates image using OpenRouter (`google/gemini-2.5-flash-image-preview`)
5. Response includes `Cache-Control` header for browser caching
6. Generated image URL (or base64 data URL) is displayed in the hero area

## Chapter Themes

Each chapter defines a visual theme for consistency across its verses:

```ts
{
  setting: "Creation of the cosmos",
  palette: "deep cosmic blues, radiant golds, ethereal whites",
  elements: "primordial void, divine light rays, swirling waters, emerging forms",
  style: "classical religious art, Baroque lighting, majestic and reverent"
}
```

This ensures all verses in Genesis 1 share:
- Consistent color palette
- Recurring visual elements
- Unified artistic style

## Prompt Construction

Prompts combine verse text with chapter theme:

```
Biblical illustration: {verse text}

Setting: {theme.setting}
Visual elements: {theme.elements}
Color palette: {theme.palette}
Style: {theme.style}
```

Example for Genesis 1:3:
```
Biblical illustration: And God said, Let there be light: and there was light.

Setting: Creation of the cosmos
Visual elements: primordial void, divine light rays, swirling waters, emerging forms
Color palette: deep cosmic blues, radiant golds, ethereal whites
Style: classical religious art, Baroque lighting, majestic and reverent
```

## Caching Strategy

Browser cache handles persistence per-verse:

- Each verse URL (including theme) caches separately
- **Soft refresh (Cmd+R)**: Browser serves cached response; no API call
- **Hard refresh (Cmd+Shift+R)**: Browser bypasses cache; new image generated
- **Navigate to different verse**: New image generated (different URL)

Server-side Next.js caching is disabled (`dynamic = 'force-dynamic'`) so the browser has full control.

Cache duration is 1 hour (`max-age=3600`).

## Provider & Model

- **Provider**: OpenRouter (OpenAI-compatible API)
- **Model**: `google/gemini-2.5-flash-image-preview`
- **Pricing**: ~$0.30/M input tokens, ~$2.50/M output tokens
- **Response format**: URL or base64 (handled automatically)
- Per-verse caching reduces redundant generation costs

## Entry Points

- Theme data: `src/data/genesis-1.ts` (`genesis1Theme`)
- API: `src/app/api/generate-image/route.ts`
- UI: `src/components/hero-image.tsx`
- Verse page: `src/app/verse/[number]/page.tsx`
