import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  readArchive,
  readArchivedEdition,
  type SavedEditionReader,
} from "./archive";

// Reader-scoped access to saved editions through Supabase, so RLS ("read own
// editions") authorises both listing and direct-id reads. Never rebuilds.
function savedEditionReader(): SavedEditionReader {
  return {
    async list() {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("editions")
        .select("id, snapshot")
        .order("edition_date", { ascending: false });
      if (error) throw new Error(error.message);
      return {
        editions: data.map((r) => ({
          snapshot: r.snapshot,
          title: null,
          // Enable only after reader authorization of historical PDF URLs is
          // verified. UUID secrecy alone is not an access-control boundary.
          pdfAvailable: false,
        })),
        currentEditionId: data[0]?.id ?? null,
      };
    },
    async read(id) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("editions")
        .select("id, snapshot")
        .order("edition_date", { ascending: false });
      if (error) throw new Error(error.message);
      const index = data.findIndex((r) => r.id === id);
      if (index < 0) return null;
      return {
        edition: {
          snapshot: data[index].snapshot,
          title: null,
          pdfAvailable: false,
        },
        isCurrent: index === 0,
      };
    },
  };
}

export async function loadArchive() {
  return readArchive(savedEditionReader());
}

export async function loadArchivedEdition(id: string) {
  return readArchivedEdition(id, savedEditionReader());
}
