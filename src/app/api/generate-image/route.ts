import { NextResponse } from "next/server";
import OpenAI from "openai";

// Disable Next.js server-side caching - let browser cache handle it
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const isImageGenerationEnabled = process.env.ENABLE_IMAGE_GENERATION === "true";

// Fallback text if no verse provided
const DEFAULT_TEXT = "In the beginning God created the heaven and the earth.";

export async function GET(request: Request) {
  if (!isImageGenerationEnabled) {
    return NextResponse.json(
      { error: "Image generation disabled" },
      { status: 403 }
    );
  }

  // Get verse text and theme from query params
  const { searchParams } = new URL(request.url);
  const verseText = searchParams.get("text") || DEFAULT_TEXT;
  const themeParam = searchParams.get("theme");

  // Build prompt with optional theme context
  let prompt: string;
  if (themeParam) {
    try {
      const theme = JSON.parse(themeParam);
      prompt = `Biblical illustration: ${verseText}

Setting: ${theme.setting}
Visual elements: ${theme.elements}
Color palette: ${theme.palette}
Style: ${theme.style}`;
    } catch {
      // Fallback if theme parsing fails
      prompt = `Biblical illustration: ${verseText}. Style: classical religious art, ethereal lighting, majestic`;
    }
  } else {
    prompt = `Biblical illustration: ${verseText}. Style: classical religious art, ethereal lighting, majestic`;
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl }, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
