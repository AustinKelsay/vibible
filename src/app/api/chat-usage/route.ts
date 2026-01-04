import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-client";
import { getSessionFromCookies } from "@/lib/session";

interface ChatUsageResponse {
  tier: string;
  date: string | null;
}

/**
 * GET /api/chat-usage
 * Returns the current chat tier and last activity timestamp for the session.
 */
export async function GET(): Promise<NextResponse<ChatUsageResponse>> {
  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({
      tier: "free",
      date: null,
    });
  }

  const sid = await getSessionFromCookies();
  if (!sid) {
    return NextResponse.json({
      tier: "free",
      date: null,
    });
  }

  try {
    const session = await convex.query(api.sessions.getSession, { sid });

    if (!session) {
      return NextResponse.json({
        tier: "free",
        date: null,
      });
    }

    return NextResponse.json({
      tier: session.tier,
      date: session.lastSeenAt ? new Date(session.lastSeenAt).toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to fetch chat usage from Convex:", error);
    return NextResponse.json({
      tier: "free",
      date: null,
    });
  }
}
