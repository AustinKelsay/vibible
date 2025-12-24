# Chat Context

High-level overview of how Visibible chat works. Details may change.

## Overview

- Client uses the AI SDK chat hook to send messages to the API route.
- Server streams responses from the model.
- Default model is Anthropic Haiku when the key is configured.

## Context Handling

- Chat requests are stateless; the server only sees what is sent per request.
- The client sends a compact page context with every message.
- Context includes passage metadata (book, chapter, verse number) and the current verse.
- The server builds a short system prompt: a basic Visibible description plus the compacted context.

## Single Verse Context

The app displays one verse at a time. Chat context reflects this:

- `book`: "Genesis"
- `chapter`: 1
- `verseRange`: Single verse number (e.g., "3")
- `heroCaption`: The verse text
- `verses`: Array with one verse object

Example context for `/genesis/1/3`:
```json
{
  "book": "Genesis",
  "chapter": 1,
  "verseRange": "3",
  "heroCaption": "And God said, Let there be light: and there was light.",
  "verses": [{ "number": 3, "text": "And God said, Let there be light: and there was light." }]
}
```

## Entry Points

- API: `src/app/api/chat/route.ts`
- UI: `src/components/chat.tsx`
- Context source: `src/app/[book]/[chapter]/[verse]/page.tsx`
