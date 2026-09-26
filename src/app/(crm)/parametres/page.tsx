import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { SettingsPage } from "@/features/system/components/settings-page";

export const metadata: Metadata = { title: "Paramètres" };

export default function Page() {
  return (
    <Guard section="parametres">
      <SettingsPage />
    </Guard>
  );
}
