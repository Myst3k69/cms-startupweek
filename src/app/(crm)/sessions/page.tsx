import { Guard } from "@/components/layout/guards";
import { SessionsPage } from "@/features/programmes/components/sessions/sessions-page";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata = { title: "Sessions & événements" };

export default async function SessionsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <Guard section="sessions">
      <SessionsPage initialView={firstParam(sp.vue)} />
    </Guard>
  );
}
