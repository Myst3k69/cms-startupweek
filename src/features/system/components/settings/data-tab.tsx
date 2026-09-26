"use client";

import * as React from "react";
import { Database, Download, RefreshCw, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Modal, useToast } from "@/components/ui";
import { ID_PREFIX, useCrm, type CrmState } from "@/lib/store";
import { remoteSync } from "@/lib/data/sync";
import { reloadWorkspace } from "@/lib/store/remote-session";
import { useSession, useSettings } from "@/lib/hooks";
import type { EntityName } from "@/lib/domain/types";
import { number } from "@/lib/format";
import { ENTITY_LABEL } from "../../lib/labels";

const COLLECTIONS = Object.keys(ID_PREFIX) as EntityName[];

type ImportPatch = Partial<Pick<CrmState, EntityName | "settings" | "activities" | "traffic">>;

function snapshot() {
  const s = useCrm.getState();
  const data: Record<string, unknown> = {};
  for (const c of COLLECTIONS) data[c] = s[c];
  return {
    format: "startupweek-os",
    version: 1,
    exportedAt: new Date().toISOString(),
    seedVersion: s.seedVersion,
    settings: s.settings,
    activities: s.activities,
    traffic: s.traffic,
    ...data,
  };
}

/** Valide un export JSON : uniquement des collections connues, sous forme de tableaux d'objets avec id. */
function parseImport(text: string): { ok: true; patch: ImportPatch; counts: [string, number][] } | { ok: false; error: string } {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: "Fichier JSON illisible." };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, error: "Objet JSON attendu (export StartupWeek OS)." };
  const o = obj as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const counts: [string, number][] = [];
  for (const c of COLLECTIONS) {
    if (!(c in o)) continue;
    const v = o[c];
    if (!Array.isArray(v) || v.some((row) => !row || typeof row !== "object" || typeof (row as { id?: unknown }).id !== "string")) {
      return { ok: false, error: `Collection « ${c} » invalide (tableau d'objets avec id attendu).` };
    }
    patch[c] = v;
    counts.push([ENTITY_LABEL[c], v.length]);
  }
  if (o.settings && typeof o.settings === "object" && !Array.isArray(o.settings)) patch.settings = { ...useCrm.getState().settings, ...(o.settings as object) };
  if (Array.isArray(o.activities)) patch.activities = o.activities;
  if (Array.isArray(o.traffic)) patch.traffic = o.traffic;
  if (!counts.length) return { ok: false, error: "Aucune collection reconnue dans ce fichier." };
  return { ok: true, patch: patch as ImportPatch, counts };
}

export function DataTab() {
  const settings = useSettings();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("parametres");
  // Sélecteur primitif (chaîne) : stable pour zustand v5.
  const sizes = useCrm((s) => COLLECTIONS.map((c) => s[c].length).join(","));
  const counts = React.useMemo(() => sizes.split(",").map(Number), [sizes]);
  const total = counts.reduce((a, b) => a + b, 0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<{ name: string; patch: ImportPatch; counts: [string, number][] } | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `startupweek-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export téléchargé", description: `${number(total)} enregistrements + paramètres et journal.` });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const r = parseImport(await file.text());
    if (!r.ok) {
      toast({ title: "Import refusé", description: r.error, tone: "danger" });
      return;
    }
    setPending({ name: file.name, patch: r.patch, counts: r.counts });
  };

  const applyImport = () => {
    if (!pending) return;
    useCrm.setState(pending.patch);
    toast({ title: "Données importées", description: `${pending.counts.length} collections remplacées depuis ${pending.name}.` });
    setPending(null);
  };

  const [reloading, setReloading] = React.useState(false);
  const reload = async () => {
    setReloading(true);
    const res = await reloadWorkspace();
    setReloading(false);
    toast(res.ok ? { title: "Données rechargées", description: "Contenu à jour avec la base." } : { title: "Rechargement impossible", description: res.message, tone: "danger" });
  };

  const reset = () => {
    useCrm.getState().resetDemo();
    setConfirmReset(false);
    toast({ title: "Démo réinitialisée", description: "Jeu de données de démonstration régénéré." });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-accent-text" aria-hidden="true" /> Mode de données
            </CardTitle>
            <CardDescription>Défini au déploiement par NEXT_PUBLIC_CRM_DATA_MODE.</CardDescription>
          </div>
          <Badge tone={remoteSync.mode === "supabase" ? "success" : "warning"} dot>
            {remoteSync.mode === "supabase" ? "Supabase" : "Démo (navigateur)"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {remoteSync.mode === "supabase" ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="min-w-0 flex-1">
                Chaque modification est écrite dans le schéma <code className="font-mono text-foreground">crm</code> avec les droits de votre rôle (RLS) ; les modifications refusées par la base sont annulées à l'écran. {remoteSync.errors.length ? <span className="text-danger-text">{remoteSync.errors.length} erreur(s) de synchronisation depuis l'ouverture.</span> : "Aucune erreur de synchronisation."}
              </p>
              <Button variant="secondary" size="sm" loading={reloading} onClick={() => void reload()}>
                <RefreshCw /> Recharger depuis la base
              </Button>
            </div>
          ) : (
            <p>
              Toutes les données vivent dans ce navigateur (stockage local) et sont générées par le jeu de démonstration — aucune donnée réelle, rien n'est envoyé. Paramètre enregistré : <span className="font-medium text-foreground">{settings.dataMode}</span>.
            </p>
          )}
          <div className="overflow-x-auto">
            <ul className="grid min-w-[280px] grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
              {COLLECTIONS.map((c, i) => (
                <li key={c} className="flex justify-between gap-2 border-b border-border py-1">
                  <span className="truncate">{ENTITY_LABEL[c]}</span>
                  <span className="tabular font-medium text-foreground">{number(counts[i])}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Exporter</CardTitle>
              <CardDescription>JSON complet : collections, paramètres, journal d'activité et trafic.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button variant="secondary" onClick={exportJson} className="w-full">
              <Download /> Télécharger l'export
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Importer</CardTitle>
              <CardDescription>Remplace les collections présentes dans le fichier (les autres sont conservées).</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <input ref={inputRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Fichier d'import JSON" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={!editable} className="w-full">
              <Upload /> Choisir un fichier…
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-danger/30">
          <CardHeader>
            <div>
              <CardTitle>Réinitialiser la démo</CardTitle>
              <CardDescription>Efface toutes les modifications locales et régénère le jeu de démonstration.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={!editable || remoteSync.mode === "supabase"} className="w-full">
              <RotateCcw /> Réinitialiser…
            </Button>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Importer ce fichier ?"
        description={pending?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Annuler
            </Button>
            <Button onClick={applyImport}>
              <Upload /> Remplacer les données
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {remoteSync.mode === "supabase" ? (
            <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              L'import ne modifie que l'affichage local : il n'est pas écrit dans Supabase.
            </p>
          ) : null}
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {pending?.counts.map(([label, n]) => (
              <li key={label} className="flex justify-between gap-2 border-b border-border py-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular font-medium text-foreground">{number(n)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Réinitialiser la démo ?"
        description="Toutes les modifications faites dans ce navigateur seront perdues. Pensez à exporter avant."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={reset}>
              <RotateCcw /> Réinitialiser
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Votre session reste ouverte ; les {number(total)} enregistrements actuels sont remplacés.</p>
      </Modal>
    </div>
  );
}
