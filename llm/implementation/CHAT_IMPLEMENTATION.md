# Chat Implementation Guide

This document describes the current chat implementation. It is intentionally high-level and will evolve.

---

## Architecture Overview

Vibible chat is a client-to-server streaming flow built on the Vercel AI SDK.

- Client UI uses `useChat` to send messages to `src/app/api/chat/route.ts`.
- The API validates input, builds a compact system prompt, and streams tokens back.
- Page context is sent with every chat request to keep the model grounded.

---

## Client Flow

### UI Entry Points

- `src/components/chat.tsx` (chat window, input, and send behavior)
- `src/app/page.tsx` (page context wiring)

### Message Send

- `sendMessage` is called with the user text.
- An extra JSON body is attached to each request: `{ context }`.
- This context is the only way the server knows which passage is on screen.

### Context Source

- `src/data/genesis-1.ts` provides the visible verse text.
- `src/app/page.tsx` computes `verseRange` and passes:
  - `book`, `chapter`, `verseRange`
  - `heroCaption`
  - `verses` (array of verse number + text)

---

## Server Flow

### API Endpoint

- `src/app/api/chat/route.ts` is the single chat API route.
- Request body:
  - `messages` (array of UI messages)
  - optional `context` (string or structured object)

### Validation

- Zod schemas validate:
  - message shape (`id`, `role`, `parts`)
  - context fields (optional)
- Invalid payloads return `400` with details.

### System Prompt Construction

The server builds a short system prompt:

1. **Base prompt**: a minimal description of Vibible.
2. **Context line**: flattened metadata for the current page.

Context compaction rules:

- Passage metadata is combined into a single `Passage: ...` line.
- Verse text is flattened into one line and trimmed to a max length (1200 chars).
- Optional fields like hero caption and image title are included if present.

---

## Model Selection

The API picks a model in this order:

1. **Anthropic** (preferred): `claude-3-haiku-20240307` if `ANTHROPIC_API_KEY` is set.
2. **OpenRouter**: `anthropic/claude-3-haiku` if `OPENROUTER_API_KEY` is set.
3. **OpenAI fallback**: `gpt-4o-mini`.

OpenRouter is configured with a custom base URL and optional headers.

---

## Streaming Response

- `streamText` is used to stream tokens from the provider.
- `toUIMessageStreamResponse()` returns a stream the client can render live.

---

## Files to Know

- `src/app/api/chat/route.ts` (validation, prompt, model selection, streaming)
- `src/components/chat.tsx` (request body wiring)
- `src/app/page.tsx` (context assembly)
- `src/data/genesis-1.ts` (current passage data)
