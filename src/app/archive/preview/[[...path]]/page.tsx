import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  ArchiveContent,
  ArchiveFrame,
  ArchiveLoading,
  ArchiveState,
} from "@/components/archive/archive-view";
import { ArchivedPaper } from "@/components/archive/archived-paper";
import { readArchive, readArchivedEdition } from "@/lib/edition/archive";

export const metadata = {
  title: "Local archive preview · The Morning Paper",
  robots: { index: false, follow: false },
};

export default function PreviewPage({
  params,
}: PageProps<"/archive/preview/[[...path]]">) {
  // Never expose fixture history in production, even with a forged URL.
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <div className="bg-accent text-paper px-4 py-3 text-center text-sm">
        Local design preview · All editions are illustrative samples.
      </div>
      <Suspense
        fallback={
          <ArchiveFrame todayHref="/archive/preview/preview-oct-17">
            <ArchiveLoading />
          </ArchiveFrame>
        }
      >
        <Preview params={params} />
      </Suspense>
    </>
  );
}

async function Preview({
  params,
}: Pick<PageProps<"/archive/preview/[[...path]]">, "params">) {
  const path = (await params).path ?? [];
  const archiveHref = "/archive/preview";
  const todayHref = "/archive/preview/preview-oct-17";
  if (path.length > 1) notFound();
  const id = path[0];
  if (id === "loading")
    return (
      <ArchiveFrame todayHref={todayHref}>
        <ArchiveLoading />
      </ArchiveFrame>
    );
  if (id === "empty" || id === "error" || id === "unavailable")
    return (
      <ArchiveFrame todayHref={todayHref}>
        <ArchiveState
          kind={id}
          archiveHref={archiveHref}
          todayHref={todayHref}
        />
      </ArchiveFrame>
    );
  const { archivePreviewReader } = await import("@/fixtures/archive-preview");
  if (!id)
    return (
      <ArchiveFrame todayHref={todayHref}>
        <ArchiveContent
          result={await readArchive(archivePreviewReader)}
          archiveHref={archiveHref}
          todayHref={todayHref}
        />
      </ArchiveFrame>
    );
  const result = await readArchivedEdition(id, archivePreviewReader);
  if (result.status === "missing")
    return (
      <ArchiveFrame todayHref={todayHref}>
        <ArchiveState
          kind="missing"
          archiveHref={archiveHref}
          todayHref={todayHref}
        />
      </ArchiveFrame>
    );
  return (
    <ArchivedPaper
      result={result}
      archiveHref={archiveHref}
      todayHref={todayHref}
    />
  );
}
