"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useActions, useCollection } from "@/lib/hooks";
import { ACADEMY_ACCESS_DAYS, COURSE_LEVELS } from "@/lib/domain/constants";
import { slugify } from "@/lib/domain/academy";
import type { CourseLevel } from "@/lib/domain/types";
import { useSession } from "@/lib/hooks";

/** Création d'une formation : métadonnées minimales + un premier module et une première leçon. */
export function NewCourseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create } = useActions();
  const courses = useCollection("courses");
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [level, setLevel] = React.useState<CourseLevel>("debutant");
  const [hours, setHours] = React.useState("7");
  const [error, setError] = React.useState<string>();

  const submit = () => {
    const t = title.trim();
    if (t.length < 4) return setError("Donnez un titre d'au moins 4 caractères.");
    let slug = slugify(t);
    if (courses.some((c) => c.slug === slug)) slug = `${slug}-${courses.length + 1}`;
    const course = create(
      "courses",
      {
        title: t,
        slug,
        subtitle: subtitle.trim(),
        description: "",
        status: "brouillon",
        level,
        personas: [],
        audience: "",
        objectives: [],
        prerequisites: "",
        durationHours: Math.max(1, Number(hours) || 1),
        priceCents: 0,
        vatRate: 20,
        inCatalog: false,
        accessDays: ACADEMY_ACCESS_DAYS,
        sequential: true,
        eventIds: [],
        tags: [],
        authorIds: user ? [user.id] : [],
        speakerIds: [],
        isTraining: true,
        evaluationMethods: "",
        assistance: "",
        accessibility: "",
        passingScore: 70,
        certificateMinProgress: 80,
      },
      { log: `Formation « ${t} » créée` },
    );
    const mod = create("courseModules", { courseId: course.id, position: 0, title: "Module 1", summary: "", objectives: [] }, { log: false });
    create(
      "lessons",
      { courseId: course.id, moduleId: mod.id, position: 0, title: "Introduction", summary: "", estimatedMinutes: 15, isPreview: true, blocks: [{ id: `${mod.id}_b1`, type: "texte", markdown: "## Ce que vous allez apprendre\n\n" }] },
      { log: false },
    );
    toast({ title: "Formation créée", description: "Structurez maintenant le programme : modules, leçons et blocs." });
    onClose();
    setTitle("");
    setSubtitle("");
    router.push(`/academy/formations/${course.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle formation"
      description="Vous pourrez tout modifier ensuite dans l'éditeur."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Créer la formation</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Titre" htmlFor="nc-title" error={error}>
          <Input id="nc-title" value={title} onChange={(e) => (setTitle(e.target.value), setError(undefined))} placeholder="Ex. Maîtriser Claude Code pour construire son SaaS" autoFocus />
        </FormField>
        <FormField label="Sous-titre (promesse)" htmlFor="nc-sub">
          <Textarea id="nc-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="min-h-16" placeholder="Ce que l'apprenant saura faire à la fin, en une phrase." />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Niveau" htmlFor="nc-level">
            <Select id="nc-level" value={level} onChange={(e) => setLevel(e.target.value as CourseLevel)} options={COURSE_LEVELS} />
          </FormField>
          <FormField label="Durée annoncée (heures)" htmlFor="nc-hours">
            <Input id="nc-hours" type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
