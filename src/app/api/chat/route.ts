import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const openRouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_REFERRER ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_TITLE ?? "vibible",
  },
});

const baseSystemPrompt =
  "You are Vibible, a prototype to vibe with the Bible. Keep replies short and grounded in the passage.";

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

const formatContext = (context?: PageContext | string) => {
  if (!context) return null;
  if (typeof context === "string") {
    const trimmed = context.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  const parts: string[] = [];
  const { book, chapter, verseRange, heroCaption, imageTitle } = context;
  const verseText = formatVerses(context.verses);
  let passage = "";

  if (book) passage = book;
  if (typeof chapter === "number") {
    passage = passage ? `${passage} ${chapter}` : `${chapter}`;
  }
  if (verseRange) {
    passage = passage ? `${passage}:${verseRange}` : verseRange;
  }

  if (passage) parts.push(`Passage: ${passage}`);
  if (heroCaption) parts.push(`Hero: ${heroCaption}`);
  if (imageTitle) parts.push(`Image: ${imageTitle}`);
  if (verseText) parts.push(`Verses: ${verseText}`);

  return parts.length > 0 ? parts.join("; ") : null;
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
 */
const requestBodySchema = z.object({
  messages: z.array(messageSchema).min(1, "Request must include at least one message"),
  context: z.union([z.string().min(1), pageContextSchema]).optional(),
});

/**
 * POST handler for chat API endpoint.
 * Validates request body using Zod schema and streams AI responses.
 */
export async function POST(req: Request) {
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

  const { messages, context } = validationResult.data;

  try {
    // Prefer Anthropic Haiku when configured.
    const model = process.env.ANTHROPIC_API_KEY
      ? anthropic("claude-3-haiku-20240307")
      : process.env.OPENROUTER_API_KEY
        ? openRouter("anthropic/claude-3-haiku")
        : openai("gpt-4o-mini");
    const contextLine = formatContext(context);
    const system = contextLine
      ? `${baseSystemPrompt}\nContext: ${contextLine}`
      : baseSystemPrompt;

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages as UIMessage[]),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
