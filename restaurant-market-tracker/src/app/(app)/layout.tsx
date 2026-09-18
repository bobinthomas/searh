import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { toSafePerson } from "@/lib/types";
import { AppShell } from "@/components/shell/AppShell";
import { PersonProvider } from "@/components/shell/PersonContext";
import { SettingsProvider } from "@/components/shell/SettingsContext";
import { getSettings } from "@/lib/settings";
import { getDb } from "@/lib/d1-context";

/**
 * Every page in this group requires a signed-in person. The real session check
 * happens here (middleware only checks that a cookie exists, because it runs
 * before the D1 binding is available).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  const safe = toSafePerson(person);
  const db = await getDb();
  const settings = await getSettings(db);

  return (
    <SettingsProvider settings={settings}>
      <PersonProvider person={safe}>
        <AppShell person={safe}>{children}</AppShell>
      </PersonProvider>
    </SettingsProvider>
  );
}
