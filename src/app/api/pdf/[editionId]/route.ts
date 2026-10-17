import type { NextRequest } from "next/server";
import { loadEdition } from "@/lib/edition/load";
import { renderPdfFromUrl } from "@/lib/pdf/render";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/pdf/[editionId]">,
) {
  const { editionId } = await ctx.params;
  const edition = await loadEdition(editionId);
  if (!edition) {
    return Response.json({ error: "edition_not_found" }, { status: 404 });
  }

  const printPath = `/print/${encodeURIComponent(edition.id)}`;
  try {
    const pdf = await renderPdfFromUrl(
      new URL(printPath, request.url).toString(),
    );
    const filename = `morning-paper-${edition.date}-no${edition.number}.pdf`;
    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[pdf] render failed", { editionId, error });
    // The print page is the fallback: the browser's own Print → Save as PDF.
    // `detail` is a short error message (no secrets) to diagnose deploys.
    const detail =
      error instanceof Error ? error.message.slice(0, 300) : "unknown error";
    return Response.json(
      { error: "pdf_render_failed", fallback: printPath, detail },
      { status: 503 },
    );
  }
}
