"use client";

import { useSyncExternalStore } from "react";

/**
 * Préférences d'affichage du back-office, hors store métier :
 * - menu de gauche replié en barre d'icônes (mémorisé dans le navigateur ; `data-sidebar` posé sur <html> avant le premier rendu par le layout racine) ;
 * - mode lecture plein écran (menu et en-tête masqués), limité aux pages sous `scope` et jamais mémorisé.
 */
const KEY = "sw-sidebar";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === "collapsed";
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(KEY, "collapsed");
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : le choix vaut pour la page ouverte */
  }
  if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  emit();
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, readCollapsed, () => false);
}

/* ── Mode lecture ── */

let focusScope: string | null = null;

/** Active le mode lecture tant que l'adresse commence par `scope` (ex. `/academy/formations/crs_x`). */
export function enterFocusMode(scope: string) {
  focusScope = scope;
  emit();
}

export function exitFocusMode() {
  if (focusScope === null) return;
  focusScope = null;
  emit();
}

export function useFocusScope(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => focusScope,
    () => null,
  );
}

export function inFocusScope(scope: string | null, pathname: string) {
  return scope !== null && (pathname === scope || pathname.startsWith(`${scope}/`));
}
