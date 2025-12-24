# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Start production server
```

## Architecture

Next.js 16 App Router with Vercel AI SDK v6 for streaming AI chat.

**Key paths:**
- `src/app/api/chat/route.ts` - AI streaming endpoint using `streamText()` + `toUIMessageStreamResponse()`
- `src/components/chat.tsx` - Client chat component using `useChat()` hook from `@ai-sdk/react`

**AI SDK v6 patterns (differs from older tutorials):**
- React hooks are in `@ai-sdk/react`, not `ai/react`
- `useChat()` returns `{ messages, sendMessage, status, error }` - no `input` or `handleInputChange`
- Send messages with `sendMessage({ text: string })`, not `{ content: string }`
- Check loading state via `status === "streaming" || status === "submitted"`
- Messages use `message.parts` array (each part has `type` and `text`), not `message.content`
- Server returns `result.toUIMessageStreamResponse()`, not `toDataStreamResponse()`

**Switching AI providers:**
```ts
// In src/app/api/chat/route.ts
model: openai("gpt-4o")           // OpenAI (default)
model: anthropic("claude-sonnet-4-20250514")  // Claude
```

## Environment

Copy `.env.example` to `.env.local` and add API keys:
- `OPENAI_API_KEY` - Required for OpenAI
- `ANTHROPIC_API_KEY` - Required for Claude
