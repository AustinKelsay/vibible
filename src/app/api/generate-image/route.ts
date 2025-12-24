import { NextResponse } from "next/server";
import OpenAI from "openai";

// Disable Next.js server-side caching - let browser cache handle it
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const isImageGenerationEnabled = process.env.ENABLE_IMAGE_GENERATION === "true";

// Hardcoded Bible text for image generation prompt
const BIBLE_TEXT = "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep.";

export async function GET() {
  if (!isImageGenerationEnabled) {
    return NextResponse.json(
      { error: "Image generation disabled" },
      { status: 403 }
    );
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: `Biblical illustration: ${BIBLE_TEXT}. Style: classical religious art, ethereal lighting, majestic`,
      n: 1,
      size: "512x512",
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
