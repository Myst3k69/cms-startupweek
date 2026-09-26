"use client";

import * as React from "react";
import { Copy, Eye, FileText, Plus, Save, Search, Send, Workflow } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import { sendEmail } from "@/lib/domain/actions";
import { TEMPLATE_CATEGORIES } from "@/lib/domain/constants";
import type { EmailTemplate, TemplateCategory } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { cn, renderTemplate } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, FormField, Input, Select, Textarea, useToast } from "@/components/ui";
import { decodeEntities, extractVariables, normText } from "../../lib/format";

const VARIABLES: { key: string; label: string }[] = [
  { key: "prenom", label: "Prénom" },
  { key: "nom", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "organisation", label: "Organisation" },
  { key: "session", label: "Session" },
  { key: "code_session", label: "Code session" },
  { key: "date_debut", label: "Date de début" },
  { key: "lieu", label: "Lieu" },
  { key: "montant", label: "Montant" },
  { key: "montant_acompte", label: "Acompte" },
  { key: "lien_paiement", label: "Lien de paiement" },
  { key: "numero", label: "N° facture / réclamation" },
  { key: "echeance", label: "Échéance" },
  { key: "service", label: "Prestation" },
];

/** Valeurs d'exemple pour l'aperçu (tirées de la prochaine session ouverte quand elle existe). */
function useSampleVars() {
  const events = useCrm((s) => s.events);
  const settings = useCrm((s) => s.settings);
  return React.useMemo(() => {
    const ev = [...events].filter((e) => e.status === "inscriptions_ouvertes").sort((a, b) => a.startAt.localeCompare(b.startAt))[0] ?? events[0];
    const price = ev?.priceCents ?? 149000;
    return {
      prenom: "Camille",
      nom: "Martin",
      email: "camille.martin@exemple.fr",
      organisation: "Kedge Business School",
      entreprise: "Kedge Business School",
      session: ev?.name ?? "StartupWeek Bordeaux — Villa",
      code_session: ev?.code ?? "SW-0012",
      date_debut: ev ? date(ev.startAt, "d MMMM yyyy") : "12 octobre 2026",
      lieu: ev?.city ?? "Bordeaux",
      montant: money(price),
      montant_acompte: money(Math.round((price * (settings.depositPercent ?? 30)) / 100)),
      lien_paiement: "https://buy.stripe.com/exemple",
      numero: `${settings.invoicePrefix ?? "F"}-2026-0042`,
      echeance: "15 octobre 2026",
      service: "Accompagnement MVP",
      sujet: "Demande d'information",
      delai: "48 h",
    } as Record<string, string>;
  }, [events, settings]);
}

export function TemplatesView() {
  const templates = useCrm((s) => s.emailTemplates);
  const emails = useCrm((s) => s.emails);
  const create = useCrm((s) => s.create);
  const { canEdit } = useSession();
  const editable = canEdit("emails");
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);

  const usage = React.useMemo(() => {
    const m = new Map<string, { sent: number; opened: number }>();
    emails.forEach((e) => {
      if (!e.templateId) return;
      const u = m.get(e.templateId) ?? { sent: 0, opened: 0 };
      if (e.status === "envoye" || e.status === "ouvert" || e.status === "clique") u.sent++;
      if (e.status === "ouvert" || e.status === "clique") u.opened++;
      m.set(e.templateId, u);
    });
    return m;
  }, [emails]);

  const groups = React.useMemo(() => {
    const needle = normText(q);
    const list = templates.filter((t) => !needle || normText(`${t.name} ${t.subject} ${t.replacesN8n ?? ""}`).includes(needle));
    return TEMPLATE_CATEGORIES.map((c) => ({ ...c, items: list.filter((t) => t.category === c.value).sort((a, b) => a.name.localeCompare(b.name, "fr")) })).filter((g) => g.items.length);
  }, [templates, q]);

  const selected = templates.find((t) => t.id === selectedId) ?? groups[0]?.items[0];

  const addTemplate = () => {
    const t = create(
      "emailTemplates",
      { name: "Nouveau template", category: "relance", subject: "Objet — {{prenom}}", body: "Bonjour {{prenom}},\n\n\n\nBelle journée,\nL'équipe StartupWeek", variables: ["prenom"] },
      { log: "Template créé" },
    );
    setSelectedId(t.id);
    toast({ title: "Template créé", description: "Complétez-le puis enregistrez." });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <div className="space-y-2 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un template…" aria-label="Rechercher un template" className="pl-8" />
          </div>
          {editable ? (
            <Button size="sm" variant="secondary" className="w-full" onClick={addTemplate}>
              <Plus /> Nouveau template
            </Button>
          ) : null}
        </div>
        <nav aria-label="Templates" className="scrollbar-thin max-h-[32rem] overflow-y-auto p-2 lg:max-h-[calc(100dvh-16rem)]">
          {groups.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Aucun template.</p> : null}
          {groups.map((g) => (
            <div key={g.value} className="mb-3">
              <p className="eyebrow px-2 pb-1 text-faint">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      aria-current={selected?.id === t.id ? "true" : undefined}
                      className={cn("w-full rounded-md px-2 py-1.5 text-left transition-colors", selected?.id === t.id ? "bg-accent-soft" : "hover:bg-surface-2")}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                        {t.replacesN8n ? <Workflow className="size-3.5 shrink-0 text-accent-text" aria-label="Remplace un workflow n8n" /> : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{t.subject}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Card>

      {selected ? (
        <TemplateEditor key={`${selected.id}:${selected.updatedAt}`} template={selected} editable={editable} usage={usage.get(selected.id)} onDuplicated={setSelectedId} />
      ) : (
        <EmptyState icon={FileText} title="Aucun template" description="Créez votre premier template d'email." />
      )}
    </div>
  );
}

function TemplateEditor({ template, editable, usage, onDuplicated }: { template: EmailTemplate; editable: boolean; usage?: { sent: number; opened: number }; onDuplicated: (id: string) => void }) {
  const update = useCrm((s) => s.update);
  const create = useCrm((s) => s.create);
  const { user } = useSession();
  const toast = useToast();
  const sample = useSampleVars();
  const [name, setName] = React.useState(template.name);
  const [category, setCategory] = React.useState<TemplateCategory>(template.category);
  const [subject, setSubject] = React.useState(template.subject);
  const [body, setBody] = React.useState(template.body);
  const [focus, setFocus] = React.useState<"subject" | "body">("body");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const subjectRef = React.useRef<HTMLInputElement>(null);

  const dirty = name !== template.name || category !== template.category || subject !== template.subject || body !== template.body;
  const vars = React.useMemo(() => extractVariables(subject, body), [subject, body]);
  const unknown = vars.filter((v) => !(v in sample));

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const el = focus === "subject" ? subjectRef.current : bodyRef.current;
    const current = focus === "subject" ? subject : body;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    if (focus === "subject") setSubject(next);
    else setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Nom obligatoire";
    if (!subject.trim()) errs.subject = "Objet obligatoire";
    if (!body.trim()) errs.body = "Corps obligatoire";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    update("emailTemplates", template.id, { name: name.trim(), category, subject: subject.trim(), body, variables: vars }, { log: "Template modifié" });
    toast({ title: "Template enregistré", description: name.trim() });
  };

  const duplicate = () => {
    const copy = create("emailTemplates", { name: `${template.name} (copie)`, category: template.category, subject: template.subject, body: template.body, variables: template.variables }, { log: `Copie de « ${template.name} »` });
    toast({ title: "Template dupliqué", description: copy.name });
    onDuplicated(copy.id);
  };

  const sendTest = () => {
    if (!user?.email) return;
    sendEmail({ to: user.email, subject: `[TEST] ${subject}`, body, vars: sample, templateId: template.id });
    toast({ title: "Email de test envoyé", description: `À ${user.email} avec les valeurs d'exemple` });
  };

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Éditeur</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {usage ? `${usage.sent} envoi${usage.sent > 1 ? "s" : ""} · ${usage.sent ? Math.round((usage.opened / usage.sent) * 100) : 0} % d'ouverture` : "Jamais envoyé"} · modifié le {date(template.updatedAt)}
            </p>
          </div>
          {template.replacesN8n ? (
            <Badge tone="accent" className="max-w-56 shrink-0" title={template.replacesN8n}>
              <Workflow className="size-3" aria-hidden="true" /> Remplace le workflow n8n « {template.replacesN8n} »
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <fieldset disabled={!editable} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nom" htmlFor="tpl-name" error={errors.name}>
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Catégorie" htmlFor="tpl-cat">
                <Select id="tpl-cat" value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)} options={TEMPLATE_CATEGORIES} />
              </FormField>
            </div>
            <FormField label="Objet" htmlFor="tpl-subject" error={errors.subject}>
              <Input id="tpl-subject" ref={subjectRef} value={subject} onFocus={() => setFocus("subject")} onChange={(e) => setSubject(e.target.value)} />
            </FormField>
            <FormField label="Corps du message" htmlFor="tpl-body" error={errors.body} hint="Texte brut ; les variables sont échappées à l'envoi (pas d'injection HTML).">
              <Textarea id="tpl-body" ref={bodyRef} value={body} onFocus={() => setFocus("body")} onChange={(e) => setBody(e.target.value)} className="min-h-72 font-mono text-[13px]" />
            </FormField>
            {editable ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Insérer une variable ({focus === "subject" ? "dans l'objet" : "dans le corps"})</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insert(v.key)}
                      title={v.label}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-ring hover:bg-accent-soft"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </fieldset>
          {editable ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button size="sm" onClick={save} disabled={!dirty}>
                <Save /> Enregistrer
              </Button>
              <Button size="sm" variant="secondary" onClick={duplicate}>
                <Copy /> Dupliquer
              </Button>
              <Button size="sm" variant="ghost" onClick={sendTest}>
                <Send /> M'envoyer un test
              </Button>
              {dirty ? <span className="ml-auto text-xs text-warning-text">Modifications non enregistrées</span> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-fit min-w-0">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Eye className="size-4 text-faint" aria-hidden="true" /> Aperçu
          </CardTitle>
          <span className="text-xs text-muted-foreground">Valeurs d'exemple</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-surface-2/60">
            <div className="space-y-1 border-b border-border px-4 py-3 text-xs text-muted-foreground">
              <p>
                De : <span className="text-foreground">StartupWeek &lt;hello@startupweek.tech&gt;</span>
              </p>
              <p>
                À : <span className="text-foreground">{sample.prenom} {sample.nom} &lt;{sample.email}&gt;</span>
              </p>
              <p className="pt-1 text-sm font-semibold text-foreground">{decodeEntities(renderTemplate(subject || "(sans objet)", sample))}</p>
            </div>
            <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground">{decodeEntities(renderTemplate(body, sample))}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Variables utilisées :
            {vars.length ? vars.map((v) => <Badge key={v} tone={unknown.includes(v) ? "warning" : "neutral"}>{`{{${v}}}`}</Badge>) : <span>aucune</span>}
          </div>
          {unknown.length ? <p className="text-xs text-warning-text">Variable{unknown.length > 1 ? "s" : ""} inconnue{unknown.length > 1 ? "s" : ""} : elles resteront affichées telles quelles si aucune valeur n'est fournie à l'envoi.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
