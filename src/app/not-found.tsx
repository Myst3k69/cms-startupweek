import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-mono text-sm text-accent-text">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page introuvable</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
      <Link href="/" className="mt-2 text-sm font-medium text-accent-text hover:underline">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
