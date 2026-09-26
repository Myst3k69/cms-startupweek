import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { HomePage } from "@/features/home/HomePage";
import { HOME_VARIANT_QUERY_PARAM, isHomeVariant } from "@/features/home/home.config";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = sp[HOME_VARIANT_QUERY_PARAM];
  return (
    <Guard section="dashboard">
      <HomePage initialVariant={isHomeVariant(q) ? q : undefined} />
    </Guard>
  );
}
