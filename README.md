# visibible

Prototype. Vibe with the bible.

## Run

```bash
npm install
npm run dev
```

## Env

Copy `.env.example` to `.env.local`.

### Convex Setup

To enable Convex features (image storage), create a deployment in the [Convex Dashboard](https://dashboard.convex.dev/):

1. Create a new deployment or use an existing one
2. Copy the **deployment name** (format: `prod:your-deployment-name`) to `CONVEX_DEPLOYMENT`
3. Copy the **public URL** (format: `https://your-deployment-name.convex.cloud`) to `NEXT_PUBLIC_CONVEX_URL`

Both values are available in your Convex dashboard under Deployment Settings.

## Vercel AI SDK

Chat API lives in `src/app/api/chat/route.ts`.

- OpenAI: set `OPENAI_API_KEY`
- Anthropic: set `ANTHROPIC_API_KEY` and switch to `anthropic(...)`
- OpenRouter: set `OPENROUTER_API_KEY` to switch automatically (optional `OPENROUTER_REFERRER`, `OPENROUTER_TITLE`)
