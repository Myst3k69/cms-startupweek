import { Guard } from "@/components/layout/guards";
import { SessionDetail } from "@/features/programmes/components/sessions/session-detail";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata = { title: "Session" };

export default async function SessionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return (
    <Guard section="sessions">
      <SessionDetail id={id} initialTab={firstParam(sp.onglet)} />
    </Guard>
  );
}
