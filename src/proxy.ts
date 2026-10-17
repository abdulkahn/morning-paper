import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, the PDF renderer and the print page it loads.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/pdf|print/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
