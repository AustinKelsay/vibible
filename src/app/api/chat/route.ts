import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    return Response.json(
      { error: "Request must include a non-empty messages array" },
      { status: 400 }
    );
  }

  const messages = body.messages as unknown[];
  for (const msg of messages) {
    if (
      !msg ||
      typeof msg !== "object" ||
      !("id" in msg) ||
      !("role" in msg) ||
      !("parts" in msg) ||
      typeof (msg as { id: unknown }).id !== "string" ||
      typeof (msg as { role: unknown }).role !== "string" ||
      !Array.isArray((msg as { parts: unknown }).parts)
    ) {
      return Response.json(
        { error: "Each message must have id (string), role (string), and parts (array)" },
        { status: 400 }
      );
    }
  }

  try {
    // Using OpenAI by default - switch to anthropic("claude-sonnet-4-20250514") for Claude
    const result = streamText({
      model: openai("gpt-4o"),
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
