"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { mediaService } from "@/lib/services/media";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { MediaForm, type MediaFormValues } from "../media-form";

export default function NewMediaPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createM = useMutation({
    mutationFn: (v: MediaFormValues) =>
      mediaService.create({
        title: v.title,
        platform: v.platform,
        sourceUrl: v.sourceUrl,
        disciplineTag: v.disciplineTag || undefined,
        eventTag: v.eventTag || undefined,
        duration: v.duration || undefined,
        thumbnailUrl: v.thumbnailUrl ?? undefined,
      }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      toast.success("Media created as draft");
      router.push(`/media/${m.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not create"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New media" description="Paste a public video URL. Publish when ready." />
      <MediaForm
        onSubmit={async (v) => { await createM.mutateAsync(v); }}
        onCancel={() => router.push("/media")}
        submitting={createM.isPending}
        submitLabel="Create draft"
      />
    </div>
  );
}
