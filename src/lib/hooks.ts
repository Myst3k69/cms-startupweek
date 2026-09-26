"use client";

import { useMemo } from "react";
import { useCrm } from "@/lib/store";
import type { EntityMap, EntityName, ID } from "@/lib/domain/types";
import { contentPerformance, type ContentPerformance } from "@/lib/domain/selectors";
import { access, type Access, type Section } from "@/lib/auth/permissions";

/**
 * Règle d'or zustand v5 : un sélecteur ne doit JAMAIS créer un nouvel objet/tableau
 * (boucle de rendu infinie). On sélectionne des références stables (collections brutes)
 * puis on dérive avec useMemo.
 */
export function useCollection<K extends EntityName>(name: K): EntityMap[K][] {
  return useCrm((s) => s[name]) as EntityMap[K][];
}

/** Index id → entité, mémoïsé sur la collection. */
export function useLookup<K extends EntityName>(name: K): Map<ID, EntityMap[K]> {
  const rows = useCollection(name);
  return useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
}

export function useEntity<K extends EntityName>(name: K, id: ID | undefined | null): EntityMap[K] | undefined {
  const rows = useCollection(name);
  return useMemo(() => (id ? rows.find((r) => r.id === id) : undefined), [rows, id]);
}

/** Chiffres de chaque contenu (saisie manuelle + audience mesurée sur le site), par id. */
export function useContentPerformance(): Map<ID, ContentPerformance> {
  const contents = useCollection("contents");
  const stats = useCrm((s) => s.contentStats);
  return useMemo(() => contentPerformance(contents, stats), [contents, stats]);
}

export const useHydrated = () => useCrm((s) => s.hydrated);

/** Horloge partagée (rafraîchie chaque minute) — à utiliser à la place de Date.now() dans le rendu. */
export const useNow = () => useCrm((s) => s.now);

export const useSettings = () => useCrm((s) => s.settings);

export function useSession() {
  const users = useCrm((s) => s.users);
  const sessionUserId = useCrm((s) => s.sessionUserId);
  const login = useCrm((s) => s.login);
  const logout = useCrm((s) => s.logout);
  const user = useMemo(() => users.find((u) => u.id === sessionUserId), [users, sessionUserId]);
  return useMemo(
    () => ({
      user,
      role: user?.role,
      login,
      logout,
      access: (section: Section): Access => access(user?.role, section),
      can: (section: Section) => access(user?.role, section) !== "none",
      canEdit: (section: Section) => access(user?.role, section) === "write",
    }),
    [user, login, logout],
  );
}

/** Actions CRUD du store (références stables). */
export function useActions() {
  const create = useCrm((s) => s.create);
  const update = useCrm((s) => s.update);
  const remove = useCrm((s) => s.remove);
  const log = useCrm((s) => s.log);
  return useMemo(() => ({ create, update, remove, log }), [create, update, remove, log]);
}
