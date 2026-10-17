import { Suspense } from "react";
import { io } from "next/cache";
import { ArchivedPaper } from "@/components/archive/archived-paper";
import { ArchiveLoading } from "@/components/archive/archive-view";
import { loadArchivedEdition } from "@/lib/edition/archive-load";

export const metadata = {
  title: "Saved edition · The Morning Paper",
  robots: { index: false },
};

export default function ArchivedEditionPage({
  params,
}: PageProps<"/archive/[editionId]">) {
  return (
    <Suspense fallback={<ArchiveLoading />}>
      <Edition params={params} />
    </Suspense>
  );
}

async function Edition({
  params,
}: Pick<PageProps<"/archive/[editionId]">, "params">) {
  await io();
  return (
    <ArchivedPaper
      result={await loadArchivedEdition((await params).editionId)}
    />
  );
}
