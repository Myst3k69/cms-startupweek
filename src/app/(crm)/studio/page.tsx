import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { StudioHome } from "@/features/studio/components/studio-home";

export const metadata: Metadata = { title: "Studio · Academy" };

export default function Page() {
  return (
    <Guard section="academy">
      <StudioHome />
    </Guard>
  );
}
