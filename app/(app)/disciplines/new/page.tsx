"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { disciplinesService } from "@/lib/services/disciplines";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DisciplineForm, type DisciplineFormValues } from "../discipline-form";

export default function NewDisciplinePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createM = useMutation({
    mutationFn: (v: DisciplineFormValues) =>
      disciplinesService.create({
        name: v.name,
        bannerUrl: v.bannerUrl ?? undefined,
        description: v.description || undefined,
        selectionCriteria: v.selectionCriteria || undefined,
        history: v.history || undefined,
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["disciplines"] });
      toast.success("Discipline created as draft");
      router.push(`/disciplines/${d.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not create"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New discipline" description="Create a draft, then publish when ready." />
      <DisciplineForm
        onSubmit={async (v) => { await createM.mutateAsync(v); }}
        onCancel={() => router.push("/disciplines")}
        submitting={createM.isPending}
        submitLabel="Create draft"
      />
    </div>
  );
}
