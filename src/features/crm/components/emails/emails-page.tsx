"use client";

import * as React from "react";
import { FileText, History, PenSquare } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import { Button, PageHeader, Tabs } from "@/components/ui";
import { EmailComposer } from "../shared/email-composer";
import { JournalView } from "./journal-view";
import { TemplatesView } from "./templates-view";

export function EmailsPage({ initial }: { initial: { onglet?: string; id?: string } }) {
  const templates = useCrm((s) => s.emailTemplates);
  const emails = useCrm((s) => s.emails);
  const { canEdit } = useSession();
  const [tab, setTab] = React.useState<"templates" | "journal">(initial.onglet === "journal" || initial.id ? "journal" : "templates");
  const [composing, setComposing] = React.useState(false);

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Emails"
        description="Templates (accusés de réception, candidatures, relances, facturation, Qualiopi) et journal de tous les envois du CRM — variables échappées, envois programmables."
        actions={
          canEdit("emails") ? (
            <Button onClick={() => setComposing(true)}>
              <PenSquare /> Nouvel email
            </Button>
          ) : null
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        tabs={[
          { value: "templates", label: "Templates", icon: FileText, count: templates.length },
          { value: "journal", label: "Journal d'envoi", icon: History, count: emails.length },
        ]}
      />
      {tab === "templates" ? <TemplatesView /> : <JournalView initialId={initial.id} />}
      <EmailComposer
        open={composing}
        onClose={() => setComposing(false)}
        recipientSearch
        onSent={() => setTab("journal")}
      />
    </div>
  );
}
