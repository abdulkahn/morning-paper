import { Suspense } from "react";
import { io } from "next/cache";
import {
  ArchiveContent,
  ArchiveFrame,
  ArchiveLoading,
} from "@/components/archive/archive-view";
import { loadArchive } from "@/lib/edition/archive-load";

export const metadata = {
  title: "Your archive · The Morning Paper",
  robots: { index: false },
};

export default function ArchivePage() {
  return (
    <ArchiveFrame>
      <Suspense fallback={<ArchiveLoading />}>
        <SavedEditions />
      </Suspense>
    </ArchiveFrame>
  );
}

async function SavedEditions() {
  await io();
  return <ArchiveContent result={await loadArchive()} />;
}
