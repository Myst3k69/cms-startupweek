"use client";

import Link from "next/link";
import type { EntityRef } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { useRefResolver } from "./hooks";

/** Lien vers l'entité rattachée (contact, candidature, facture, opportunité…). */
export function EntityRefLink({ value, className, showKind = true }: { value?: EntityRef; className?: string; showKind?: boolean }) {
  const resolve = useRefResolver();
  if (!value) return <span className="text-xs text-faint">—</span>;
  const r = resolve(value);
  const body = (
    <>
      {showKind ? <span className="mr-1 text-muted-foreground">{r.kind} ·</span> : null}
      <span className="truncate">{r.label}</span>
    </>
  );
  if (!r.href) return <span className={cn("inline-flex min-w-0 items-center text-xs", className)}>{body}</span>;
  return (
    <Link
      href={r.href}
      onClick={(e) => e.stopPropagation()}
      className={cn("inline-flex min-w-0 max-w-full items-center text-xs text-foreground underline-offset-2 hover:text-accent-text hover:underline", className)}
    >
      {body}
    </Link>
  );
}
