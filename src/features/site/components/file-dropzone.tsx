"use client";

import * as React from "react";
import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DroppedFile {
  name: string;
  sizeKb: number;
  ext: string;
}

/**
 * Zone de dépôt (simulée en démo) : lit uniquement le nom et la taille du fichier.
 * En production, le fichier part dans le bucket Supabase Storage « ressources ».
 */
export function FileDropzone({ onFile, compact, disabled }: { onFile: (f: DroppedFile) => void; compact?: boolean; disabled?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const id = React.useId();

  const handle = (file: File | undefined) => {
    if (!file) return;
    const dot = file.name.lastIndexOf(".");
    onFile({ name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), ext: dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "" });
  };

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) handle(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2/40 text-center transition-colors",
        compact ? "gap-1 px-3 py-3" : "gap-2 px-4 py-6",
        over && "border-ring bg-accent-soft",
        disabled && "opacity-60",
      )}
    >
      {!compact ? <CloudUpload className="size-7 text-faint" aria-hidden="true" /> : null}
      <p className="text-sm text-foreground">
        {compact ? "Déposez la nouvelle version ou " : "Déposez un fichier ici ou "}
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="font-medium text-accent-text underline-offset-2 hover:underline">
          parcourez
        </button>
      </p>
      {!compact ? <p className="text-xs text-muted-foreground">PDF, Word, Excel, ZIP, vidéo… — démo : seuls le nom et la taille sont lus, l'URL de stockage est générée.</p> : null}
      <input
        id={id}
        ref={inputRef}
        type="file"
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
