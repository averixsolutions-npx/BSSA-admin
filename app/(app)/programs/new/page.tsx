"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { programsService } from "@/lib/services/programs";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ProgramForm, type ProgramFormValues } from "../program-form";

export default function NewProgramPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createM = useMutation({
    mutationFn: (v: ProgramFormValues) =>
      programsService.create({
        name: v.name,
        bannerUrl: v.bannerUrl ?? undefined,
        body: v.body || undefined,
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created as draft");
      router.push(`/programs/${p.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not create"),
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader title="New program" description="Create a draft, then publish when ready." />
      <ProgramForm
        onSubmit={async (v) => { await createM.mutateAsync(v); }}
        onCancel={() => router.push("/programs")}
        submitting={createM.isPending}
        submitLabel="Create draft"
      />
    </div>
  );
}
