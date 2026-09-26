import { AppShell } from "@/components/layout/app-shell";
import { RequireSession } from "@/components/layout/guards";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  );
}
