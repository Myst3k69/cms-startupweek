"use client";

import * as React from "react";
import type { z } from "zod";
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, useToast } from "@/components/ui";
import { useCrm } from "@/lib/store";
import { useSession, useSettings } from "@/lib/hooks";
import type { Settings } from "@/lib/domain/types";

export type SettingsKey = keyof Settings;
export type FieldErrors = Partial<Record<string, string>>;

function pick<K extends SettingsKey>(s: Settings, keys: readonly K[]): Pick<Settings, K> {
  return Object.fromEntries(keys.map((k) => [k, s[k]])) as Pick<Settings, K>;
}

/**
 * Brouillon local d'un sous-ensemble des paramètres + validation zod optionnelle.
 * L'enregistrement passe par `updateSettings` (store) — écriture réservée aux admins.
 */
export function useSettingsDraft<K extends SettingsKey>(keys: readonly K[], schema?: z.ZodType) {
  const settings = useSettings();
  const updateSettings = useCrm((s) => s.updateSettings);
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("parametres");
  // `keys` doit être une constante de module (référence stable).
  const saved = React.useMemo(() => pick(settings, keys), [settings, keys]);
  const [draft, setDraft] = React.useState<Pick<Settings, K>>(saved);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = <F extends K>(k: F, v: Settings[F]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const reset = () => {
    setDraft(saved);
    setErrors({});
  };

  const save = (message = "Paramètres enregistrés") => {
    if (!editable) return;
    if (schema) {
      const r = schema.safeParse(draft);
      if (!r.success) {
        const next: FieldErrors = {};
        for (const issue of r.error.issues) {
          const k = String(issue.path[0] ?? "");
          if (k && !next[k]) next[k] = issue.message;
        }
        setErrors(next);
        toast({ title: "Vérifiez le formulaire", description: Object.values(next)[0], tone: "danger" });
        return;
      }
    }
    updateSettings(draft);
    setErrors({});
    toast({ title: message });
  };

  return { draft, set, errors, dirty, reset, save, editable };
}

export function FormCard({
  title,
  description,
  dirty,
  editable,
  onReset,
  onSave,
  children,
  aside,
}: {
  title: string;
  description?: string;
  dirty: boolean;
  editable: boolean;
  onReset: () => void;
  onSave: () => void;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <CardHeader>
            <div>
              <CardTitle>{title}</CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
            {dirty ? <Badge tone="warning">Non enregistré</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
          {editable ? (
            <CardFooter className="justify-end">
              <Button variant="ghost" onClick={onReset} disabled={!dirty}>
                Annuler
              </Button>
              <Button type="submit" disabled={!dirty}>
                Enregistrer
              </Button>
            </CardFooter>
          ) : (
            <CardFooter>
              <p className="text-xs text-muted-foreground">Lecture seule : seuls les administrateurs modifient les paramètres.</p>
            </CardFooter>
          )}
        </form>
      </Card>
      {aside ? <div className="space-y-6">{aside}</div> : null}
    </div>
  );
}
