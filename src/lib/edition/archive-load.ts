import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  readArchive,
  readArchivedEdition,
  currentEditionIdForDate,
  type SavedEditionReader,
} from "./archive";
import { editionDateInTimeZone } from "./format";

async function readerSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user) {
    if (authError && authError.name !== "AuthSessionMissingError")
      throw new Error("Reader session unavailable");
    return null;
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Reader timezone unavailable");
  return {
    supabase,
    today: editionDateInTimeZone(new Date(), profile?.timezone ?? "UTC"),
  };
}

// Reader-scoped access to saved editions through Supabase, so RLS ("read own
// editions") authorises both listing and direct-id reads. Never rebuilds.
function savedEditionReader(): SavedEditionReader {
  return {
    async list() {
      const session = await readerSession();
      if (!session) return { editions: [], currentEditionId: null };
      const { supabase, today } = session;
      const { data, error } = await supabase
        .from("editions")
        .select("id, snapshot, edition_date")
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
        currentEditionId: currentEditionIdForDate(data, today),
      };
    },
    async read(id) {
      const session = await readerSession();
      if (!session) return null;
      const { supabase, today } = session;
      const { data, error } = await supabase
        .from("editions")
        .select("id, snapshot, edition_date")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        edition: {
          snapshot: data.snapshot,
          title: null,
          pdfAvailable: false,
        },
        isCurrent: data.edition_date === today,
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
