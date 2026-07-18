"use client";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { newsService } from "@/lib/services/news";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { NewsForm, type NewsFormValues } from "../news-form";

export default function EditNewsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["news", "detail", id],
    queryFn: () => newsService.getById(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: NewsFormValues) =>
      newsService.update(id, {
        title: values.title,
        category: values.category,
        coverUrl: values.coverUrl ?? undefined,
        body: values.body,
        pdfUrl: values.pdfUrl ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Changes saved");
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not save");
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => newsService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article published");
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not publish");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => newsService.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article unpublished");
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not unpublish");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => newsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article deleted");
      router.push("/news");
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not delete");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Couldn't load this article. It may have been deleted.</p>
        <Button variant="outline" onClick={() => router.push("/news")}>
          Back to news
        </Button>
      </div>
    );
  }

  const isPublished = article.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={article.title}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={article.status} />
            <span className="text-muted-foreground">{article.category}</span>
          </span>
        }
        action={
          <>
            {isPublished ? (
              <Button variant="outline" onClick={() => unpublishMutation.mutate()}>
                <EyeOff className="h-4 w-4" />
                Unpublish
              </Button>
            ) : (
              <Button variant="outline" onClick={() => publishMutation.mutate()}>
                <Eye className="h-4 w-4" />
                Publish
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      <NewsForm
        initialValues={article}
        onSubmit={async (values) => {
          await updateMutation.mutateAsync(values);
        }}
        onCancel={() => router.push("/news")}
        submitting={updateMutation.isPending}
        submitLabel="Save changes"
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this article?"
        description={`"${article.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
