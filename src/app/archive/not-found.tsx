import { ArchiveFrame, ArchiveState } from "@/components/archive/archive-view";

export default function MissingEdition() {
  return (
    <ArchiveFrame>
      <ArchiveState kind="missing" />
    </ArchiveFrame>
  );
}
