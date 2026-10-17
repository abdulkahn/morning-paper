import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintView } from "@/components/paper/print-view";
import { loadEdition, STATIC_EDITION_IDS } from "@/lib/edition/load";

// Print layout of an edition. The PDF route renders this page with Chromium;
// it also works as a "Print / Save as PDF" fallback in any browser.

export const metadata: Metadata = {
  title: "The Morning Paper — print edition",
  robots: { index: false },
};

export function generateStaticParams() {
  return STATIC_EDITION_IDS.map((editionId) => ({ editionId }));
}

export default async function PrintPage({
  params,
}: PageProps<"/print/[editionId]">) {
  const edition = await loadEdition((await params).editionId);
  if (!edition) notFound();
  return <PrintView edition={edition} />;
}
