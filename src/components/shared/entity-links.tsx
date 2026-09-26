"use client";

import Link from "next/link";
import { useEntity } from "@/lib/hooks";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ID } from "@/lib/domain/types";

const linkCls = "text-foreground underline-offset-2 hover:text-accent-text hover:underline";

export function ContactLink({ id, className, withEmail }: { id?: ID; className?: string; withEmail?: boolean }) {
  const c = useEntity("contacts", id);
  if (!c) return <span className="text-faint">—</span>;
  return (
    <span className={cn("min-w-0", className)}>
      <Link href={`/contacts/${c.id}`} className={cn(linkCls, "font-medium")} onClick={(e) => e.stopPropagation()}>
        {c.firstName} {c.lastName}
      </Link>
      {withEmail ? <span className="block truncate text-xs text-muted-foreground">{c.email}</span> : null}
    </span>
  );
}

export function OrgLink({ id, className }: { id?: ID; className?: string }) {
  const o = useEntity("organizations", id);
  if (!o) return <span className="text-faint">—</span>;
  return (
    <Link href={`/organisations/${o.id}`} className={cn(linkCls, className)} onClick={(e) => e.stopPropagation()}>
      {o.name}
    </Link>
  );
}

export function SessionLink({ id, className, short }: { id?: ID; className?: string; short?: boolean }) {
  const e = useEntity("events", id);
  if (!e) return <span className="text-faint">—</span>;
  return (
    <Link href={`/sessions/${e.id}`} className={cn(linkCls, className)} onClick={(ev) => ev.stopPropagation()} title={e.name}>
      <span className="font-mono text-xs text-muted-foreground">{e.code}</span>
      {short ? null : <span className="ml-1.5">{e.city}</span>}
    </Link>
  );
}

export function UserChip({ id, size = "xs", showName = true }: { id?: ID; size?: "xs" | "sm"; showName?: boolean }) {
  const u = useEntity("users", id);
  if (!u) return <span className="text-xs text-faint">Non assigné</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar name={u.name} color={u.color} size={size} />
      {showName ? <span className="truncate text-xs text-muted-foreground">{u.name.split(" ")[0]}</span> : null}
    </span>
  );
}
