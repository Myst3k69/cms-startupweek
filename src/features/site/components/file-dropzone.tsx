"use client";

import * as React from "react";
import { CloudUpload, LoaderCircle } from "lucide-react";
import { supabaseConfigured } from "@/lib/data/supabase";
import { cn } from "@/lib/utils";
import { UPLOAD_ACCEPT } from "../lib/resource";

export interface DroppedFile {
  file: File;
  name: string;
  sizeKb: number;
  ext: string;
}

/**
 * Zone de dépôt d'un fichier de ressource. L'envoi (bucket Supabase Storage
 * « ressources », simulé en démo) est fait par l'appelant ; `busy` pendant l'envoi.
 */
export function FileDropzone({ onFile, compact, disabled, busy }: { onFile: (f: DroppedFile) => void; compact?: boolean; disabled?: boolean; busy?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const id = React.useId();
  const off = disabled || busy;

  const handle = (file: File | undefined) => {
    if (!file) return;
    const dot = file.name.lastIndexOf(".");
    onFile({ file, name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), ext: dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "" });
  };

  return (
    <div
      onDragOver={(e) => {
        if (off) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!off) handle(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2/40 text-center transition-colors",
        compact ? "gap-1 px-3 py-3" : "gap-2 px-4 py-6",
        over && "border-ring bg-accent-soft",
        disabled && "opacity-60",
      )}
      aria-busy={busy || undefined}
    >
      {compact ? null : busy ? <LoaderCircle className="size-7 animate-spin text-faint" aria-hidden="true" /> : <CloudUpload className="size-7 text-faint" aria-hidden="true" />}
      {busy ? (
        <p className="text-sm text-foreground" role="status">
          Envoi du fichier…
        </p>
      ) : (
        <p className="text-sm text-foreground">
          {compact ? "Déposez la nouvelle version ou " : "Déposez un fichier ici ou "}
          <button type="button" disabled={off} onClick={() => inputRef.current?.click()} className="font-medium text-accent-text underline-offset-2 hover:underline">
            parcourez
          </button>
        </p>
      )}
      {!compact ? (
        <p className="text-xs text-muted-foreground">
          PDF, Markdown, texte ou ZIP — 20 Mo maximum.{supabaseConfigured ? "" : " Démo : le fichier n'est pas envoyé, son URL est simulée."}
        </p>
      ) : null}
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choisir un fichier"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
