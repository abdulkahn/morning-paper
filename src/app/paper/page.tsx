import { redirect } from "next/navigation";

export const metadata = {
  title: "Today’s Paper · The Morning Paper",
  robots: { index: false },
};

// Keep older bookmarks working; /today owns the existing daily-paper flow.
export default function TodayPage() {
  redirect("/today");
}
