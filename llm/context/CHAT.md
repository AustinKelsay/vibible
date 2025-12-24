# Chat Context

High-level overview of how Vibible chat works. Details may change.

## Overview

- Client uses the AI SDK chat hook to send messages to the API route.
- Server streams responses from the model.
- Default model is Anthropic Haiku when the key is configured.

## Context Handling

- Chat requests are stateless; the server only sees what is sent per request.
- The client sends a compact page context with every message.
- Context includes passage metadata (book, chapter, verse range) and the visible verses.
- The server builds a short system prompt: a basic Vibible description plus the compacted context.
- Verse text is flattened into a single line and trimmed to keep tokens low.

## Entry Points

- API: `src/app/api/chat/route.ts`
- UI: `src/components/chat.tsx`
