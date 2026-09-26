/**
 * Aide à la rédaction StartupWeek Academy (Claude, SDK officiel).
 *
 * Quatre usages, tous sous le contrôle de l'auteur (le résultat est un brouillon à relire,
 * inséré dans l'éditeur sans être enregistré) :
 *   - « lecon »     : premier jet complet d'une leçon (texte, exercice, prompt, checklist, quiz) ;
 *   - « quiz »      : quiz de vérification à partir du contenu de la leçon ;
 *   - « variante »  : réécriture d'un bloc de texte pour un profil (tech / non-tech / reconversion) ;
 *   - « ameliorer » : relecture d'un bloc (clarté, vouvoiement, exactitude, format).
 *
 * Sortie structurée (output_config.format + zod) : jamais de JSON bricolé.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { LessonBlock, Persona } from "@/lib/domain/types";

export const AI_MODES = ["lecon", "quiz", "variante", "ameliorer"] as const;
export type AiMode = (typeof AI_MODES)[number];

export const AiRequestSchema = z.object({
  mode: z.enum(AI_MODES),
  course: z.object({
    title: z.string().max(300),
    subtitle: z.string().max(600).default(""),
    audience: z.string().max(2000).default(""),
    level: z.string().max(40).default("debutant"),
    objectives: z.array(z.string().max(500)).max(20).default([]),
  }),
  module: z.object({ title: z.string().max(300), summary: z.string().max(2000).default("") }).optional(),
  lesson: z.object({
    title: z.string().max(300),
    summary: z.string().max(2000).default(""),
    estimatedMinutes: z.number().int().min(1).max(600).default(30),
    /** Texte actuel de la leçon (Markdown des blocs), pour « quiz ». */
    text: z.string().max(60_000).default(""),
  }),
  persona: z.enum(["tech", "non_tech", "reconversion"]).optional(),
  /** Bloc source pour « variante » / « ameliorer ». */
  sourceText: z.string().max(30_000).optional(),
  /** Consignes libres de l'auteur. */
  instructions: z.string().max(4000).optional(),
});
export type AiRequest = z.infer<typeof AiRequestSchema>;

const Question = z.object({
  prompt: z.string(),
  multiple: z.boolean(),
  options: z.array(z.object({ label: z.string(), correct: z.boolean() })),
  explanation: z.string(),
});

/** Schéma « à plat » (un seul objet pour tous les types de bloc) : robuste en sortie structurée. */
const DraftBlock = z.object({
  type: z.enum(["texte", "quiz", "exercice", "prompt", "checklist"]),
  title: z.string(),
  markdown: z.string(),
  questions: z.array(Question),
  deliverable: z.enum(["texte", "lien", "fichier", "aucun"]),
  estimatedMinutes: z.number().int(),
  rubric: z.array(z.string()),
  tool: z.string(),
  prompt: z.string(),
  items: z.array(z.string()),
});
const DraftOutput = z.object({ blocks: z.array(DraftBlock) });
type Draft = z.infer<typeof DraftBlock>;

const PERSONA_LABEL: Record<Persona, string> = {
  tech: "profil technique (développeur, ingénieur, data) : aller plus loin techniquement, outils de code, bonnes pratiques d'ingénierie",
  non_tech: "profil non technique (entrepreneur, expert métier) : outils sans code ou générateurs d'applications, vocabulaire expliqué, focus sur le résultat",
  reconversion: "personne en reconversion : repères pas à pas, définitions, réassurance, rythme progressif, exemples concrets du quotidien",
};

const SYSTEM = `Vous êtes rédacteur pédagogique pour StartupWeek Academy, organisme de formation (démarche Qualiopi) qui apprend à concevoir, construire et lancer un MVP numérique avec les outils d'IA.

Style : français, vouvoiement, ton direct, concret, bienveillant et exigeant ; phrases courtes ; chaque terme technique est défini à sa première occurrence. Chaque leçon annonce d'abord ce que l'apprenant saura faire, puis apporte le contenu, des exemples et au moins une mise en pratique sur son propre projet.

Markdown autorisé (rendu maison, pas de HTML) : « ## » et « ### » (jamais « # »), paragraphes, **gras**, *italique*, \`code\`, liens [texte](https://…), listes « - » et « 1. » sans imbrication, tableaux avec ligne séparatrice, encadrés d'un seul paragraphe « > [!tip] … » (tip, info, warning, success), blocs de code. Pas d'images, pas d'emoji décoratif.

Exactitude : les outils évoluent vite. Décrivez des capacités durables ; n'indiquez aucun prix, quota, nom d'offre, numéro de version ou nom de modèle précis ; n'inventez aucune statistique, étude, citation ni témoignage ; en cas de doute, restez général et renvoyez à la documentation officielle. Sujets juridiques : informations générales et renvoi aux sources officielles, en précisant que ce n'est pas un conseil juridique. Ne recommandez jamais de coller des secrets ou des données personnelles dans un prompt.

Format de sortie : une liste de blocs. Pour chaque bloc, remplissez les champs utiles à son type et laissez les autres vides ("" ou [] ; estimatedMinutes = 0, deliverable = "aucun") :
- texte : markdown ;
- quiz : title, questions (3 à 4 options, explication pour chacune ; multiple = true seulement s'il y a plusieurs bonnes réponses) ;
- exercice : title, markdown (= consigne), deliverable, estimatedMinutes, rubric (3 à 5 critères de réussite) ;
- prompt : title, tool (Claude, ChatGPT, Claude Code, Codex, Cursor, Bolt.new, Claude Cowork, Gamma ou « Tout assistant IA »), prompt (prêt à copier, avec des [crochets] pour les variables) ;
- checklist : title, items (4 à 10).`;

function userPrompt(req: AiRequest): string {
  const ctx = [
    `Formation : « ${req.course.title} »${req.course.subtitle ? ` — ${req.course.subtitle}` : ""} (niveau ${req.course.level}).`,
    req.course.audience ? `Public : ${req.course.audience}` : "",
    req.course.objectives.length ? `Objectifs de la formation :\n${req.course.objectives.map((o) => `- ${o}`).join("\n")}` : "",
    req.module ? `Module : « ${req.module.title} »${req.module.summary ? ` — ${req.module.summary}` : ""}` : "",
    `Leçon : « ${req.lesson.title} »${req.lesson.summary ? ` — ${req.lesson.summary}` : ""} (durée visée : ${req.lesson.estimatedMinutes} min).`,
  ]
    .filter(Boolean)
    .join("\n");
  const extra = req.instructions?.trim() ? `\n\nConsignes de l'auteur :\n${req.instructions.trim()}` : "";
  switch (req.mode) {
    case "lecon":
      return `${ctx}\n\nRédigez le premier jet complet de cette leçon : un bloc texte principal (600 à 1 200 mots, sections ##), puis les activités adaptées (exercice sur le projet de l'apprenant, prompt prêt à copier et/ou checklist), et terminez par un quiz de vérification de 3 à 5 questions. La somme des durées des exercices ne dépasse pas les deux tiers de la durée de la leçon.${extra}`;
    case "quiz":
      return `${ctx}\n\nContenu actuel de la leçon :\n<lecon>\n${req.lesson.text || "(vide)"}\n</lecon>\n\nProduisez un seul bloc quiz de 4 à 6 questions qui vérifient la compréhension de CE contenu (pas de connaissances extérieures), avec une explication pour chaque question.${extra}`;
    case "variante":
      return `${ctx}\n\nBloc de texte d'origine :\n<texte>\n${req.sourceText ?? ""}\n</texte>\n\nRéécrivez ce bloc pour un ${PERSONA_LABEL[req.persona ?? "non_tech"]}. Mêmes objectifs, exemples et outils adaptés à ce profil. Produisez un seul bloc texte.${extra}`;
    case "ameliorer":
      return `${ctx}\n\nBloc de texte à relire :\n<texte>\n${req.sourceText ?? ""}\n</texte>\n\nAméliorez-le : clarté, structure, vouvoiement, exactitude (retirez toute affirmation invérifiable), format Markdown autorisé. Conservez le fond et la longueur approximative. Produisez un seul bloc texte.${extra}`;
  }
}

let cached: Anthropic | null = null;
/** Client Anthropic (clé ANTHROPIC_API_KEY côté serveur uniquement) ; null si non configuré. */
export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  cached ??= new Anthropic();
  return cached;
}

const nid = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

/** Bloc rédigé → bloc de leçon (identifiants neufs, profil éventuel). */
function toBlock(d: Draft, persona?: Persona): LessonBlock | null {
  const personas = persona ? { personas: [persona] } : {};
  switch (d.type) {
    case "texte":
      return d.markdown.trim() ? { id: nid("blk"), type: "texte", markdown: d.markdown.trim(), ...personas } : null;
    case "quiz": {
      const questions = d.questions
        .filter((q) => q.prompt.trim() && q.options.length >= 2 && q.options.some((o) => o.correct))
        .map((q) => ({
          id: nid("q"),
          prompt: q.prompt.trim(),
          kind: (q.options.filter((o) => o.correct).length > 1 ? "multiple" : "unique") as "unique" | "multiple",
          options: q.options.map((o) => ({ id: nid("o"), label: o.label.trim(), correct: o.correct })),
          explanation: q.explanation.trim() || undefined,
        }));
      return questions.length ? { id: nid("blk"), type: "quiz", title: d.title.trim() || "Vérifiez vos acquis", graded: false, questions, ...personas } : null;
    }
    case "exercice":
      return d.markdown.trim()
        ? {
            id: nid("blk"),
            type: "exercice",
            title: d.title.trim() || "Mise en pratique",
            instructions: d.markdown.trim(),
            deliverable: d.deliverable,
            estimatedMinutes: Math.max(5, Math.min(600, d.estimatedMinutes || 30)),
            review: d.deliverable === "aucun" ? "auto" : "formateur",
            rubric: d.rubric.map((r) => r.trim()).filter(Boolean),
            ...personas,
          }
        : null;
    case "prompt":
      return d.prompt.trim() ? { id: nid("blk"), type: "prompt", title: d.title.trim() || "Prompt", tool: d.tool.trim() || "Tout assistant IA", prompt: d.prompt.trim(), ...personas } : null;
    case "checklist": {
      const items = d.items.map((i) => i.trim()).filter(Boolean);
      return items.length >= 2 ? { id: nid("blk"), type: "checklist", title: d.title.trim() || "Checklist", items: items.map((label) => ({ id: nid("itm"), label })), ...personas } : null;
    }
  }
}

export type AiResult = { ok: true; blocks: LessonBlock[]; model: string } | { ok: false; status: number; error: string; message: string };

export async function draftWithClaude(client: Anthropic, req: AiRequest): Promise<AiResult> {
  const model = process.env.ACADEMY_AI_MODEL || "claude-opus-5";
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Refus éventuel du modèle : relance automatique côté serveur sur le modèle recommandé.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(DraftOutput) },
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(req) }],
    });
    if (response.stop_reason === "refusal") {
      return { ok: false, status: 422, error: "REFUSED", message: "Le modèle a décliné cette demande. Reformulez la consigne." };
    }
    if (response.stop_reason === "max_tokens") {
      return { ok: false, status: 502, error: "TRUNCATED", message: "Réponse trop longue, interrompue. Réessayez avec une leçon plus courte ou des consignes plus ciblées." };
    }
    const parsed = response.parsed_output;
    if (!parsed) return { ok: false, status: 502, error: "UNPARSEABLE", message: "Réponse illisible, réessayez." };
    const persona = req.mode === "variante" ? req.persona : undefined;
    const blocks = parsed.blocks.map((b) => toBlock(b, persona)).filter((b): b is LessonBlock => b !== null);
    if (!blocks.length) return { ok: false, status: 502, error: "EMPTY", message: "Aucun bloc exploitable dans la réponse, réessayez." };
    return { ok: true, blocks, model: response.model };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, status: 503, error: "AI_AUTH", message: "Clé d'API Anthropic invalide (ANTHROPIC_API_KEY)." };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, status: 429, error: "AI_RATE_LIMIT", message: "Trop de demandes en cours côté Anthropic : réessayez dans une minute." };
    if (error instanceof Anthropic.BadRequestError) return { ok: false, status: 502, error: "AI_BAD_REQUEST", message: `Requête refusée par l'API : ${error.message}` };
    if (error instanceof Anthropic.APIError) return { ok: false, status: 502, error: "AI_API_ERROR", message: `Erreur de l'API Anthropic (${error.status ?? "réseau"}).` };
    throw error;
  }
}
