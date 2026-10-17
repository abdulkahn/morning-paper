import { notFound } from "next/navigation";
import { ArchiveFrame, ArchiveState } from "./archive-view";
import { PaperView } from "@/components/paper/paper-view";
import type { ArchivedEditionResult } from "@/lib/edition/archive";

export function ArchivedPaper({
  result,
  archiveHref = "/archive",
  todayHref = "/paper",
}: {
  result: ArchivedEditionResult;
  archiveHref?: string;
  todayHref?: string;
}) {
  if (result.status === "missing") notFound();
  if (result.status !== "ready")
    return (
      <ArchiveFrame todayHref={todayHref}>
        <ArchiveState
          kind={result.status}
          archiveHref={archiveHref}
          todayHref={todayHref}
        />
      </ArchiveFrame>
    );
  return (
    <PaperView
      edition={result.edition.snapshot}
      context={{
        archived: !result.isCurrent,
        archiveHref,
        todayHref,
        pdfAvailable: result.edition.pdfAvailable,
      }}
    />
  );
}
