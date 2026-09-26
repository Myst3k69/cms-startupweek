import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ContentsPage } from "@/features/site/components/contents-page";

export const metadata: Metadata = { title: "Contenus" };

export default function Page() {
  return (
    <Guard section="contenus">
      <ContentsPage />
    </Guard>
  );
}
