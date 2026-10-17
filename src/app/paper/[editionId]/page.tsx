import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

export default function PaperPage({ params }: PageProps<"/paper/[editionId]">) {
  return (
    <Suspense
      fallback={
        <p className="text-ink-muted mx-auto max-w-6xl px-4 py-8 sm:px-6">
          Fetching your edition…
        </p>
      }
    >
      <Paper params={params} />
    </Suspense>
  );
}

async function Paper({
  params,
}: Pick<PageProps<"/paper/[editionId]">, "params">) {
  const edition = await loadEdition((await params).editionId);
  if (!edition) notFound();
  return <PaperView edition={edition} />;
}
