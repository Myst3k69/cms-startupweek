"use client";

import * as React from "react";
import { z } from "zod";
import { Pencil, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Modal, Select, StatusBadge, Switch, useToast } from "@/components/ui";
import { SERIES } from "@/components/charts";
import { NAV_ITEMS } from "@/components/layout/nav";
import { PERMISSIONS, type Access, type Section } from "@/lib/auth/permissions";
import { useActions, useCollection, useSession } from "@/lib/hooks";
import { ROLES, labelOf } from "@/lib/domain/constants";
import type { Role, User } from "@/lib/domain/types";
import { normalizeEmail } from "@/lib/utils";

const SECTION_LABEL: Record<Section, string> = Object.fromEntries(NAV_ITEMS.map((n) => [n.section, n.label])) as Record<Section, string>;
const SECTIONS = Object.keys(PERMISSIONS.admin) as Section[];
const ROLE_LIST = ROLES.map((r) => r.value);

const ROLE_SCOPE: Record<Role, string> = {
  admin: "Tout, y compris paramètres, équipe et données",
  commercial: "Demandes, contacts, pipeline, candidatures, facturation",
  pedagogie: "Sessions, candidatures, Qualiopi, ressources, contenus",
  formateur: "Ses sessions, projets et relances",
  lecture: "Consultation seule (ex. expert-comptable)",
};

function AccessBadge({ access }: { access: Access }) {
  if (access === "write") return <Badge tone="success" className="px-1.5">Écriture</Badge>;
  if (access === "read") return <Badge tone="info" className="px-1.5">Lecture</Badge>;
  return (
    <span className="text-faint" aria-label="Aucun accès">
      —
    </span>
  );
}

const userSchema = z.object({
  name: z.string().trim().min(3, { error: "Nom complet requis" }),
  email: z.email({ error: "Email invalide" }),
  title: z.string().trim().min(2, { error: "Fonction requise" }),
  role: z.enum(["admin", "commercial", "pedagogie", "formateur", "lecture"]),
});

type UserDraft = { name: string; email: string; title: string; role: Role };

function UserModal({ user, onClose }: { user?: User; onClose: () => void }) {
  const users = useCollection("users");
  const { create, update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<UserDraft>(() => (user ? { name: user.name, email: user.email, title: user.title, role: user.role } : { name: "", email: "", title: "", role: "commercial" }));
  const [errors, setErrors] = React.useState<Partial<Record<keyof UserDraft, string>>>({});
  const set = <K extends keyof UserDraft>(k: K, v: UserDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = userSchema.safeParse(draft);
    const next: Partial<Record<keyof UserDraft, string>> = {};
    if (!r.success) for (const i of r.error.issues) next[i.path[0] as keyof UserDraft] ??= i.message;
    const email = normalizeEmail(draft.email);
    if (!next.email && users.some((u) => u.id !== user?.id && normalizeEmail(u.email) === email)) next.email = "Un membre utilise déjà cet email.";
    if (user && user.role === "admin" && draft.role !== "admin" && users.filter((u) => u.role === "admin" && u.active).length <= 1) next.role = "Impossible : c'est le dernier administrateur actif.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    if (user) {
      update("users", user.id, { name: draft.name.trim(), email, title: draft.title.trim(), role: draft.role }, { log: user.role !== draft.role ? `Rôle : ${labelOf(ROLES, user.role)} → ${labelOf(ROLES, draft.role)}` : "Membre modifié" });
      toast({ title: "Membre mis à jour", description: draft.name });
    } else {
      create("users", { name: draft.name.trim(), email, title: draft.title.trim(), role: draft.role, color: SERIES[users.length % SERIES.length], active: true }, { log: `Membre ajouté (${labelOf(ROLES, draft.role)})` });
      toast({ title: "Membre ajouté", description: `${draft.name} — invitation envoyée à ${email} (Supabase Auth en production).` });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? "Modifier le membre" : "Ajouter un membre"}
      description={user ? undefined : "Il recevra un lien de connexion (magic link Supabase Auth en production)."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="user-form">
            {user ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <FormField label="Nom complet" htmlFor="u-name" error={errors.name}>
          <Input id="u-name" autoFocus value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Email" htmlFor="u-email" error={errors.email}>
          <Input id="u-email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
        </FormField>
        <FormField label="Fonction" htmlFor="u-title" error={errors.title}>
          <Input id="u-title" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. : Chargée de relation participants" />
        </FormField>
        <FormField label="Rôle" htmlFor="u-role" error={errors.role} hint={ROLE_SCOPE[draft.role]}>
          <Select id="u-role" value={draft.role} options={ROLES} onChange={(e) => set("role", e.target.value as Role)} />
        </FormField>
      </form>
    </Modal>
  );
}

export function TeamTab() {
  const users = useCollection("users");
  const { update } = useActions();
  const toast = useToast();
  const { canEdit, user: me } = useSession();
  const editable = canEdit("parametres");
  const [modal, setModal] = React.useState<{ user?: User } | null>(null);
  const activeAdmins = users.filter((u) => u.role === "admin" && u.active).length;

  const toggleActive = (u: User, active: boolean) => {
    if (!active && u.id === me?.id) {
      toast({ title: "Action impossible", description: "Vous ne pouvez pas désactiver votre propre compte.", tone: "danger" });
      return;
    }
    if (!active && u.role === "admin" && activeAdmins <= 1) {
      toast({ title: "Action impossible", description: "Il doit rester au moins un administrateur actif.", tone: "danger" });
      return;
    }
    update("users", u.id, { active }, { log: active ? "Accès réactivé" : "Accès désactivé", kind: "statut" });
    toast({ title: active ? "Accès réactivé" : "Accès désactivé", description: u.name, tone: active ? "success" : "info" });
  };

  const changeRole = (u: User, role: Role) => {
    if (u.role === "admin" && role !== "admin" && activeAdmins <= 1 && u.active) {
      toast({ title: "Action impossible", description: "C'est le dernier administrateur actif.", tone: "danger" });
      return;
    }
    update("users", u.id, { role }, { log: `Rôle : ${labelOf(ROLES, u.role)} → ${labelOf(ROLES, role)}`, kind: "statut" });
    toast({ title: "Rôle modifié", description: `${u.name} → ${labelOf(ROLES, role)}` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Équipe</CardTitle>
            <CardDescription>
              {users.filter((u) => u.active).length} membre{users.filter((u) => u.active).length > 1 ? "s" : ""} actif{users.filter((u) => u.active).length > 1 ? "s" : ""} · les droits s'appliquent aussi en base (RLS Supabase)
            </CardDescription>
          </div>
          {editable ? (
            <Button size="sm" onClick={() => setModal({})}>
              <UserPlus /> Ajouter
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <ul className="divide-y divide-border border-t border-border">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={u.name} color={u.color} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {u.name}
                    {u.id === me?.id ? <Badge tone="accent">Vous</Badge> : null}
                    {!u.active ? <Badge>Désactivé</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.title} · {u.email}
                  </p>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-auto">
                  {editable ? (
                    <Select aria-label={`Rôle de ${u.name}`} value={u.role} options={ROLES} onChange={(e) => changeRole(u, e.target.value as Role)} className="min-w-44 flex-1 sm:flex-none" />
                  ) : (
                    <StatusBadge options={ROLES} value={u.role} />
                  )}
                  <Switch checked={u.active} onChange={(v) => toggleActive(u, v)} disabled={!editable} label={u.active ? `Désactiver ${u.name}` : `Réactiver ${u.name}`} />
                  {editable ? (
                    <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${u.name}`} onClick={() => setModal({ user: u })}>
                      <Pencil />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Matrice des droits</CardTitle>
            <CardDescription>Lecture seule — définie dans le code (lib/auth/permissions) et dupliquée dans les policies RLS de la base.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-y border-border bg-surface-2/60">
                  <th scope="col" className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                    Section
                  </th>
                  {ROLE_LIST.map((r) => (
                    <th key={r} scope="col" className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {labelOf(ROLES, r)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((s) => (
                  <tr key={s} className="border-b border-border last:border-0">
                    <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-normal text-foreground sm:px-5">
                      {SECTION_LABEL[s] ?? s}
                    </th>
                    {ROLE_LIST.map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        <AccessBadge access={PERMISSIONS[r][s]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {modal ? <UserModal key={modal.user?.id ?? "new"} user={modal.user} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
