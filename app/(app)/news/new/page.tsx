"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { newsService } from "@/lib/services/news";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { NewsForm, type NewsFormValues } from "../news-form";

export default function NewNewsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: NewsFormValues) =>
      newsService.create({
        title: values.title,
        category: values.category,
        coverUrl: values.coverUrl ?? undefined,
        body: values.body,
        pdfUrl: values.pdfUrl ?? undefined,
      }),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article created as draft");
      router.push(`/news/${article.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not create article");
    },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title="New article"
        description="Create a draft. Publish from the article list or edit page once you're ready."
      />
      <NewsForm
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
        onCancel={() => router.push("/news")}
        submitting={createMutation.isPending}
        submitLabel="Create draft"
      />
    </div>
  );
}
