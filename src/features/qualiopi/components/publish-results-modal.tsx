"use client";

import * as React from "react";
import { Check, Copy, Globe } from "lucide-react";
import { useActions, useNow, useSession } from "@/lib/hooks";
import { date } from "@/lib/format";
import { Badge, Button, Modal, Textarea, useToast } from "@/components/ui";
import { fmt1, fmtPct, resultIndicators, type ResultIndicators } from "../metrics";
import type { QualiopiData } from "../use-qualiopi-data";

function resultTiles(r: ResultIndicators) {
  return [
    { value: fmtPct(r.satisfactionPct), label: "de stagiaires satisfaits ou très satisfaits", hint: `${r.responses} répondant(s)` },
    { value: fmt1(r.avgSatisfaction, " / 5"), label: "note moyenne de satisfaction à chaud", hint: r.nps !== null ? `NPS ${r.nps > 0 ? "+" : ""}${r.nps}` : undefined },
    { value: fmtPct(r.attendanceRate), label: "taux d'assiduité (demi-journées émargées)", hint: r.completionRate !== null ? `${fmtPct(r.completionRate)} de parcours complets` : undefined },
    { value: String(r.trainees), label: "stagiaires formés", hint: `${r.sessions} session(s)${r.since ? ` depuis ${date(r.since, "MMMM yyyy")}` : ""}` },
  ];
}

/** Échappement du contenu texte (pas d'attributs dynamiques dans le bloc). */
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

function toHtml(r: ResultIndicators, asOf: string) {
  const items = resultTiles(r)
    .map((t) => `    <li><strong>${esc(t.value)}</strong> ${esc(t.label)}${t.hint ? ` <small>(${esc(t.hint)})</small>` : ""}</li>`)
    .join("\n");
  return `<section class="sw-resultats" aria-labelledby="sw-resultats-titre">\n  <h2 id="sw-resultats-titre">Nos résultats</h2>\n  <ul>\n${items}\n  </ul>\n  <p><small>Indicateurs au ${esc(asOf)}, calculés sur les sessions de formation terminées. Mis à jour après chaque session.</small></p>\n</section>`;
}

/** Aperçu + publication des indicateurs de résultats (indicateur 2). */
export function PublishResultsModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: QualiopiData }) {
  const now = useNow();
  const { create, update } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);
  const r = React.useMemo(() => resultIndicators(data, now), [data, now]);
  const asOf = date(new Date(now).toISOString(), "d MMMM yyyy");
  const html = React.useMemo(() => toHtml(r, asOf), [r, asOf]);
  const lastPublished = React.useMemo(
    () => data.evidences.filter((e) => e.indicatorCode === 2).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [data.evidences],
  );
  const ind2 = data.indicators.find((i) => i.code === 2);

  const publish = () => {
    create(
      "evidences",
      {
        indicatorCode: 2,
        title: `Indicateurs de résultats publiés sur le site — ${asOf}`,
        kind: "enregistrement",
        url: data.settings.website,
        note: `Satisfaction ${fmtPct(r.satisfactionPct)} · note ${fmt1(r.avgSatisfaction, "/5")} · assiduité ${fmtPct(r.attendanceRate)} · ${r.trainees} stagiaires / ${r.sessions} sessions.`,
      },
      { log: "Indicateurs de résultats publiés (indicateur 2)" },
    );
    if (ind2) update("indicators", ind2.id, { lastReviewedAt: new Date().toISOString() });
    toast({ title: "Publication enregistrée", description: "Preuve ajoutée à l'indicateur 2. Pensez à mettre à jour la page du site." });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Publier les indicateurs de résultats"
      description="Indicateur 2 — bloc à intégrer sur le site (page d'accueil ou « Nos résultats »), calculé sur les données réelles des sessions terminées."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          {canEdit("qualiopi") ? (
            <Button onClick={publish} disabled={!r.trainees}>
              <Globe /> Marquer comme publié
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        {lastPublished ? (
          <p className="text-xs text-muted-foreground">
            Dernière publication enregistrée : <span className="font-medium text-foreground">{date(lastPublished.createdAt)}</span>
          </p>
        ) : (
          <Badge tone="warning" dot>
            Jamais publiés
          </Badge>
        )}

        {!r.trainees ? (
          <p className="rounded-md border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
            Aucune session de formation terminée : les indicateurs seront disponibles après la première session.
          </p>
        ) : (
          <div className="rounded-xl border border-border bg-surface-2/60 p-5">
            <p className="eyebrow text-accent-text">Aperçu site</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-foreground">Nos résultats</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {resultTiles(r).map((t) => (
                <li key={t.label} className="rounded-lg border border-border bg-surface p-4">
                  <p className="tabular font-display text-3xl font-semibold tracking-tight text-foreground">{t.value}</p>
                  <p className="mt-1 text-sm text-foreground">{t.label}</p>
                  {t.hint ? <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p> : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Indicateurs au {asOf}, calculés sur les sessions de formation terminées. Mis à jour après chaque session.</p>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Code HTML à intégrer</span>
            <Button
              size="xs"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(html);
                  setCopied(true);
                  toast({ title: "HTML copié" });
                } catch {
                  toast({ title: "Copie impossible", description: "Sélectionnez le code manuellement.", tone: "danger" });
                }
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copié" : "Copier le HTML"}
            </Button>
          </div>
          <Textarea readOnly value={html} aria-label="Code HTML des indicateurs de résultats" className="min-h-40 font-mono text-xs" />
        </div>
        <p className="text-xs text-muted-foreground">
          Ne mentionnez pas de certification Qualiopi tant que le certificat n'est pas délivré : publiez uniquement des indicateurs chiffrés, datés et vérifiables.
        </p>
      </div>
    </Modal>
  );
}
