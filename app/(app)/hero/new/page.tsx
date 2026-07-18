"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { heroService } from "@/lib/services/hero";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { HeroForm, type HeroFormValues } from "../hero-form";

export default function NewHeroPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createM = useMutation({
    mutationFn: (v: HeroFormValues) =>
      heroService.create({
        imageUrl: v.imageUrl,
        headline: v.headline,
        tag: v.tag || undefined,
        ctaLabel: v.ctaLabel || undefined,
        ctaHref: v.ctaHref || undefined,
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["hero"] });
      toast.success("Slide created as draft");
      router.push(`/hero/${s.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not create"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New hero slide" description="Create a draft, then publish when ready." />
      <HeroForm
        onSubmit={async (v) => { await createM.mutateAsync(v); }}
        onCancel={() => router.push("/hero")}
        submitting={createM.isPending}
        submitLabel="Create draft"
      />
    </div>
  );
}
