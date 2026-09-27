/**
 * Fichiers des ressources : bucket public « ressources » de Supabase Storage.
 *
 * Mode supabase : le fichier est envoyé avec la session de l'utilisateur (policies
 * storage.objects : écriture sur la section « ressources ») ; son URL publique est
 * stable (un dépôt n'écrase jamais un fichier : nouveau chemin à chaque version).
 * Mode démo : rien n'est envoyé, l'URL est simulée.
 */
import { getSupabase } from "@/lib/data/supabase";
import { demoStorageUrl, UPLOAD_TYPES } from "./resource";

const BUCKET = "ressources";

function describeStorageError(error: { message: string; statusCode?: string }): string {
  switch (error.statusCode) {
    case "401":
    case "403":
      return "Envoi refusé : vos droits ne permettent pas d'ajouter un fichier aux ressources.";
    case "413":
      return "Fichier trop volumineux : 20 Mo maximum.";
    case "415":
      return "Type de fichier refusé : PDF, Markdown (.md), texte (.txt) ou ZIP uniquement.";
    case "404":
      return "Stockage introuvable : le bucket « ressources » n'existe pas dans Supabase.";
    default:
      return error.message;
  }
}

/** Envoie le fichier sous `path` et renvoie son URL publique ; erreur au message lisible si refus. */
export async function uploadResourceFile(file: File, path: string, ext: string): Promise<string> {
  const c = getSupabase();
  if (!c) return demoStorageUrl(path);
  // Type imposé par l'extension : le navigateur en donne parfois un autre (ZIP sous Windows) ou aucun (.md).
  const body = new File([file], file.name, { type: UPLOAD_TYPES[ext] });
  const bucket = c.storage.from(BUCKET);
  const { error } = await bucket.upload(path, body, { upsert: false });
  if (error) throw new Error(describeStorageError(error));
  return bucket.getPublicUrl(path).data.publicUrl;
}

/** Retire des fichiers déposés puis abandonnés (formulaire annulé, fichier remplacé avant enregistrement). */
export function discardResourceFiles(paths: string[]) {
  const c = getSupabase();
  if (!c || !paths.length) return;
  void c.storage
    .from(BUCKET)
    .remove(paths)
    .then(({ error }) => {
      if (error) console.error("[ressources] fichiers abandonnés non supprimés", paths, error.message);
    });
}
