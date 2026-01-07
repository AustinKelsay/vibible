import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

/**
 * Public endpoint to serve images from Convex storage.
 * URL format: /image/{storageId}
 *
 * This provides permanent URLs for stored images (e.g., for Nostr posts)
 * since ctx.storage.getUrl() returns short-lived signed URLs.
 */
http.route({
  path: "/image/{storageId}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.pathname.split("/image/")[1];

    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }

    const blob = await ctx.storage.get(storageId as Id<"_storage">);
    if (!blob) {
      return new Response("Image not found", { status: 404 });
    }

    // Return the image with appropriate headers
    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }),
});

export default http;
