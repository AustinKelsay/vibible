# Bible API Context

High-level overview of how Visibible fetches Bible text. Details may change.

## Overview

- Visibible uses [bible-api.com](https://bible-api.com) to fetch scripture text.
- The KJV (King James Version) translation is used.
- All 66 books of the Bible are available.
- Data is cached aggressively since scripture text is immutable.

## Data Flow

1. User navigates to a verse (e.g., `/genesis/1/1`).
2. Server validates the URL against static book/chapter/verse data.
3. Server fetches the verse text from bible-api.com (or cache).
4. Verse is rendered with navigation to adjacent verses.

## Static Structure Data

To avoid API calls for navigation logic, the app stores static metadata:

- All 66 books with IDs, names, and URL slugs
- Chapter counts per book
- Verse counts per chapter

This enables instant prev/next navigation without querying the API.

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/data/kjv/{BOOK_ID}/{chapter}` | Fetch all verses in a chapter |
| `/{reference}?translation=kjv` | Fetch specific verse(s) by reference |

## Caching Strategy

- Next.js fetch cache with 30-day revalidation.
- Chapters are fetched whole and cached; individual verse lookups use the cached chapter.
- Rate limit is 15 requests per 30 seconds—caching prevents hitting this.

## Entry Points

- Static data: `src/data/bible-structure.ts`
- API client: `src/lib/bible-api.ts`
- Page route: `src/app/[book]/[chapter]/[verse]/page.tsx`
