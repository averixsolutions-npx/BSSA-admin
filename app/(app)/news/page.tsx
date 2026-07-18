"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { newsService } from "@/lib/services/news";
import type { NewsArticle, ContentStatus } from "@/lib/types";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

export default function NewsListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [pendingDelete, setPendingDelete] = useState<NewsArticle | null>(null);

  // ── List query ──
  const { data, isLoading, isError } = useQuery({
    queryKey: ["news", "list", { page, status }],
    queryFn: () => newsService.list({ page, limit: 20, status: status || undefined }),
  });

  // ── Mutations ──
  const publishMutation = useMutation({
    mutationFn: (id: string) => newsService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article published");
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not publish");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => newsService.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article unpublished");
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not unpublish");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => newsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article deleted");
      setPendingDelete(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiCallError ? err.message : "Could not delete");
    },
  });

  // ── Columns — filter by search client-side, everything else server-side ──
  const filteredItems = (data?.items ?? []).filter((a) =>
    !search.trim() ? true : a.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const columns: ColumnDef<NewsArticle>[] = [
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/news/${row.original.id}`)}
          className="font-medium text-left hover:underline"
        >
          {row.original.title}
        </button>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.category}</span>,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      header: "Published",
      cell: ({ row }) =>
        row.original.publishedAt
          ? format(new Date(row.original.publishedAt), "d MMM yyyy")
          : <span className="text-muted-foreground">—</span>,
    },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => {
        const article = row.original;
        const isPublished = article.status === "PUBLISHED";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/news/${article.id}`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isPublished ? (
                <DropdownMenuItem onClick={() => unpublishMutation.mutate(article.id)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Unpublish
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => publishMutation.mutate(article.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setPendingDelete(article)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="News"
        description="Articles and announcements shown on the public site."
        action={
          <Button onClick={() => router.push("/news/new")}>
            <Plus className="h-4 w-4" />
            New article
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No news articles yet. Click 'New article' to create the first one."
        search={{
          value: search,
          onChange: (v) => { setSearch(v); },
          placeholder: "Search by title…",
        }}
        toolbar={
          <Select
            value={status || "all"}
            onValueChange={(v) => { setStatus(v === "all" ? "" : (v as ContentStatus)); setPage(1); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        }
        pagination={
          data
            ? {
                page: data.meta.page,
                limit: data.meta.limit,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this article?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be permanently deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await deleteMutation.mutateAsync(pendingDelete.id);
        }}
      />
    </div>
  );
}
