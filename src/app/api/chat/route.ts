import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL, getModelPricing } from "@/lib/chat-models";
import {
  computeChatCreditsCost,
  ModelPricing,
  CREDIT_USD,
} from "@/lib/chat-credits";
import { getSessionFromCookies } from "@/lib/session";
import { getConvexClient } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// OpenRouter client - the single provider for all chat
const openRouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_REFERRER ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_TITLE ?? "visibible",
  },
});

// Verse context for prev/next verses
const verseContextSchema = z.object({
  number: z.number(),
  text: z.string(),
  reference: z.string().optional(),
});

const pageContextSchema = z
  .object({
    book: z.string().optional(),
    chapter: z.number().optional(),
    verseRange: z.string().optional(),
    heroCaption: z.string().optional(),
    imageTitle: z.string().optional(),
    verses: z
      .array(
        z.object({
          number: z.number().optional(),
          text: z.string().optional(),
        })
      )
      .optional(),
    prevVerse: verseContextSchema.optional(),
    nextVerse: verseContextSchema.optional(),
  })
  .passthrough();

type PageContext = z.infer<typeof pageContextSchema>;

const formatVerses = (verses?: PageContext["verses"]) => {
  if (!verses?.length) return null;

  const compact = verses
    .map((verse) => {
      if (!verse?.text) return null;
      const trimmed = verse.text.trim();
      if (!trimmed) return null;
      return typeof verse.number === "number" ? `${verse.number} ${trimmed}` : trimmed;
    })
    .filter(Boolean)
    .join(" ");

  if (!compact) return null;

  const maxLength = 1200;
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trim()}...` : compact;
};

const TOKEN_CHARS_PER_TOKEN = 4;
const PROMPT_TOKEN_BUFFER = 1.25;
const MAX_CHAT_OUTPUT_TOKENS = 1200;

const estimateInputTokens = (messages: Array<{ parts: Array<{ type: string; text?: string }> }>) => {
  const totalChars = messages.reduce((sum, message) => {
    const messageChars = message.parts.reduce((partSum, part) => {
      if (part.type !== "text") return partSum;
      return partSum + (part.text?.length ?? 0);
    }, 0);
    return sum + messageChars;
  }, 0);

  return Math.ceil(totalChars / TOKEN_CHARS_PER_TOKEN);
};

/**
 * Build a rich, contextual system prompt for the AI.
 * This gives the AI full awareness of where we are in Scripture.
 */
const buildSystemPrompt = (context?: PageContext | string): string => {
  const basePrompt = `You are Visibible, a reverent guide helping users connect deeply with Scripture.`;

  if (!context) {
    return `${basePrompt}\n\nHelp users understand and connect with God's Word. Be spiritually encouraging and keep responses grounded in Scripture.`;
  }

  if (typeof context === "string") {
    const trimmed = context.trim();
    return trimmed.length > 0
      ? `${basePrompt}\n\nContext: ${trimmed}`
      : basePrompt;
  }

  const { book, chapter, verseRange, prevVerse, nextVerse } = context;
  const currentVerseText = formatVerses(context.verses);

  // Build location string (e.g., "Genesis 1:3")
  let location = "";
  if (book) location = book;
  if (typeof chapter === "number") {
    location = location ? `${location} ${chapter}` : `Chapter ${chapter}`;
  }
  if (verseRange) {
    location = location ? `${location}:${verseRange}` : `Verse ${verseRange}`;
  }

  // Build the full system prompt
  let prompt = basePrompt;

  // Add current position
  if (location) {
    prompt += `\n\nCurrent Position: ${location}`;
  }

  // Add scripture context with prev/current/next
  prompt += "\n\nScripture Context:";
  if (prevVerse) {
    prompt += `\n- Previous (v${prevVerse.number}): "${prevVerse.text}"`;
  }
  if (currentVerseText) {
    prompt += `\n- CURRENT${verseRange ? ` (v${verseRange})` : ""}: "${currentVerseText}"`;
  }
  if (nextVerse) {
    prompt += `\n- Next (v${nextVerse.number}): "${nextVerse.text}"`;
  }

  // Add guidance
  prompt += `\n\nHelp users understand this verse in its biblical context. Share its meaning within the chapter and book, its theological significance, and how it connects to the broader story of Scripture. Be spiritually encouraging and help users connect personally with God's Word. Keep responses grounded but offer deeper insight when helpful.`;

  return prompt;
};

/**
 * Schema for message parts. Each part must have a type and corresponding content.
 * For text parts, the text field is required.
 */
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
}).passthrough(); // Allow additional fields for extensibility

/**
 * Schema for a single message. Validates id, role (must be one of allowed values),
 * and parts array structure.
 */
const messageSchema = z.object({
  id: z.string().min(1, "Message id must be a non-empty string"),
  role: z.enum(["user", "assistant", "system"], {
    message: "Role must be one of: user, assistant, system",
  }),
  parts: z.array(messagePartSchema).min(1, "Message must have at least one part"),
});

/**
 * Schema for the request body. Must contain a non-empty messages array.
 * Pricing is looked up server-side from OpenRouter - never trusted from client.
 */
const requestBodySchema = z.object({
  messages: z.array(messageSchema).min(1, "Request must include at least one message"),
  context: z.union([z.string().min(1), pageContextSchema]).optional(),
  model: z.string().optional(),
});

/**
 * POST handler for chat API endpoint.
 * Uses OpenRouter exclusively for all chat models.
 * Validates request body using Zod schema and streams AI responses with metadata.
 * Requires authentication and deducts credits based on model used.
 */
export async function POST(req: Request) {
  // Validate OpenRouter API key
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  // Session and credit tracking - Convex is REQUIRED for authentication
  const convex = getConvexClient();
  if (!convex) {
    // Fail closed: if Convex is unavailable, deny access rather than allowing unauthenticated requests
    console.error("[Chat] Convex client unavailable - denying request");
    return Response.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  let isAdmin = false;
  let reservationMade = false;
  const generationId = crypto.randomUUID();

  // Require valid session
  const sid = await getSessionFromCookies();
  if (!sid) {
    return Response.json(
      { error: "Session required for chat" },
      { status: 401 }
    );
  }

  // Verify session exists in Convex
  const session = await convex.query(api.sessions.getSession, { sid });
  if (!session) {
    return Response.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }

  isAdmin = session.tier === "admin";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate request body structure and message format
  const validationResult = requestBodySchema.safeParse(body);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((err: z.ZodIssue) => {
      const path = err.path.join(".");
      return path ? `${path}: ${err.message}` : err.message;
    });
    return Response.json(
      {
        error: "Validation failed",
        details: errors,
      },
      { status: 400 }
    );
  }

  const { messages, context, model: requestedModel } = validationResult.data;

  // Use requested model or fall back to default
  const modelId = requestedModel || DEFAULT_CHAT_MODEL;
  const startTime = Date.now();

  // SECURITY: Look up pricing from server-side cache - never trust client-supplied pricing
  const trustedPricing = await getModelPricing(modelId, process.env.OPENROUTER_API_KEY!);

  // Reserve a conservative worst-case based on estimated prompt size and a server-enforced output cap.
  const estimatedInputTokens = Math.ceil(
    estimateInputTokens(messages) * PROMPT_TOKEN_BUFFER
  );
  const estimatedCredits = computeChatCreditsCost(
    estimatedInputTokens,
    MAX_CHAT_OUTPUT_TOKENS,
    trustedPricing as ModelPricing
  );
  const estimatedCostUsd = estimatedCredits * CREDIT_USD;

  // Reserve estimated credits before streaming (non-admin only)
  // Actual cost is calculated after streaming based on real token usage
  if (convex && sid && !isAdmin) {
    const reserveResult = await convex.mutation(api.sessions.reserveCredits, {
      sid,
      amount: estimatedCredits,
      modelId,
      generationId,
      costUsd: estimatedCostUsd,
    });

    if (!reserveResult.success) {
      return Response.json(
        {
          error: "Insufficient credits",
          required: estimatedCredits,
          available: "available" in reserveResult ? reserveResult.available : 0,
        },
        { status: 402 }
      );
    }

    reservationMade = true;
  }

  try {
    const system = buildSystemPrompt(context);

    const result = streamText({
      model: openRouter(modelId),
      system,
      messages: await convertToModelMessages(messages as UIMessage[]),
      maxTokens: MAX_CHAT_OUTPUT_TOKENS,
      // Convert reservation to debit when stream completes successfully
      // Calculate actual cost based on real token usage with server-verified pricing
      onFinish: async ({ usage }) => {
        if (reservationMade) {
          try {
            // Calculate actual credits from real token counts using trusted pricing
            const inputTokens = usage?.inputTokens ?? 0;
            const outputTokens = usage?.outputTokens ?? 0;
            const actualCredits = computeChatCreditsCost(
              inputTokens,
              outputTokens,
              trustedPricing as ModelPricing
            );
            const actualCostUsd = actualCredits * CREDIT_USD;

            const deductResult = await convex.mutation(api.sessions.deductCredits, {
              sid,
              amount: actualCredits,
              modelId,
              generationId,
              costUsd: actualCostUsd,
            });

            if (!deductResult.success) {
              console.error(
                "[Chat API] Credit conversion failed after streaming:",
                deductResult
              );
            }
          } catch (error) {
            console.error("Failed to deduct credits:", error);
            // Release reservation on debit failure to avoid stuck credits
            try {
              await convex.mutation(api.sessions.releaseReservation, {
                sid,
                generationId,
              });
            } catch (releaseError) {
              console.error("Failed to release reservation after debit failure:", releaseError);
            }
          }
        }
      },
    });

    // Stream response with metadata injection
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // Inject metadata on finish to capture usage stats
        if (part.type === "finish") {
          const endTime = Date.now();
          const inputTokens = part.totalUsage?.inputTokens ?? 0;
          const outputTokens = part.totalUsage?.outputTokens ?? 0;
          // Calculate actual credits for metadata display using trusted pricing
          const actualCredits = computeChatCreditsCost(
            inputTokens,
            outputTokens,
            trustedPricing as ModelPricing
          );
          return {
            model: modelId,
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
            finishReason: part.finishReason,
            latencyMs: endTime - startTime,
            creditsCost: actualCredits,
          };
        }
        return undefined;
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Release reservation on failure
    if (reservationMade) {
      try {
        await convex.mutation(api.sessions.releaseReservation, {
          sid,
          generationId,
        });
      } catch (releaseError) {
        console.error("Failed to release reservation:", releaseError);
      }
    }

    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
