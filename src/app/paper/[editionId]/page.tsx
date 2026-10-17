import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperView } from "@/components/paper/paper-view";
import { formatEditionDate } from "@/lib/edition/format";
import { loadEdition, STATIC_EDITION_IDS } from "@/lib/edition/load";

export function generateStaticParams() {
  return STATIC_EDITION_IDS.map((editionId) => ({ editionId }));
}

export async function generateMetadata({
  params,
}: PageProps<"/paper/[editionId]">): Promise<Metadata> {
  const edition = await loadEdition((await params).editionId);
  return {
    title: edition
      ? `${formatEditionDate(edition.date)} · The Morning Paper`
      : "The Morning Paper",
  };
}

export default async function PaperPage({
  params,
}: PageProps<"/paper/[editionId]">) {
  const edition = await loadEdition((await params).editionId);
  if (!edition) notFound();
  return <PaperView edition={edition} />;
}
