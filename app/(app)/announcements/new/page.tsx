"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { announcementsService } from "@/lib/services/announcements";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { AnnouncementForm, type AnnouncementFormValues } from "../announcement-form";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createM = useMutation({
    mutationFn: (v: AnnouncementFormValues) =>
      announcementsService.create({ text: v.text, href: v.href || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement created");
      router.push("/announcements");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Could not create"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New announcement" description="Add a line to the public ticker." />
      <AnnouncementForm
        onSubmit={async (v) => { await createM.mutateAsync(v); }}
        onCancel={() => router.push("/announcements")}
        submitting={createM.isPending}
        submitLabel="Create"
      />
    </div>
  );
}
