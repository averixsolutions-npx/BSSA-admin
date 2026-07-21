"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Copy, Ban, ShieldAlert, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { associationsAdminService } from "@/lib/services/associations-admin";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { AccountStatusBadge } from "@/components/account-status-badge";
import { ModerationDialog } from "@/components/moderation-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AssociationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [moderating, setModerating] = useState<"SUSPENDED" | "BLACKLISTED" | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: assoc, isLoading } = useQuery({
    queryKey: ["associations", "detail", id],
    queryFn: () => associationsAdminService.getById(id),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: (isPublished: boolean) => associationsAdminService.setPublished(id, isPublished),
    onSuccess: (_, isPublished) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(isPublished ? "Published" : "Unpublished");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED"; reason?: string }) =>
      associationsAdminService.setStatus(id, status, reason),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["associations"] });
      toast.success(v.status === "ACTIVE" ? "Reactivated" : v.status === "SUSPENDED" ? "Suspended" : "Blacklisted");
    },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed"),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!assoc) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Couldn&apos;t load this association.</p>
        <Button variant="outline" onClick={() => router.push("/associations")}>Back</Button>
      </div>
    );
  }

  const status = assoc.account?.status ?? "ACTIVE";

  // Photos → lightbox (only those that exist)
  const images: LightboxImage[] = [
    ...(assoc.coverUrl ? [{ url: assoc.coverUrl, label: `${assoc.name} — cover` }] : []),
    ...(assoc.logoUrl ? [{ url: assoc.logoUrl, label: `${assoc.name} — logo` }] : []),
  ];

  const details: { label: string; value: string | null }[] = [
    { label: "President", value: assoc.president },
    { label: "Treasurer", value: assoc.treasurer },
    { label: "Contact person", value: assoc.contactPerson },
    { label: "Contact mobile", value: assoc.contactMobile },
    { label: "Email", value: assoc.email },
    { label: "Incorporation no.", value: assoc.incorporationNumber },
    { label: "State", value: assoc.state },
    { label: "Address", value: assoc.address },
  ];

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/associations")} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to associations
      </Button>

      {/* Cover + logo banner (only if photos exist) */}
      {(assoc.coverUrl || assoc.logoUrl) && (
        <div className="relative overflow-hidden rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => assoc.coverUrl && setLightboxIndex(0)}
            className="block h-40 w-full bg-muted"
          >
            {assoc.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assoc.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </button>
          {assoc.logoUrl && (
            <button
              type="button"
              onClick={() => setLightboxIndex(assoc.coverUrl ? 1 : 0)}
              className="absolute bottom-3 left-4 h-16 w-16 overflow-hidden rounded-lg border-2 border-background bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assoc.logoUrl} alt="" className="h-full w-full object-cover" />
            </button>
          )}
        </div>
      )}

      <PageHeader
        title={assoc.name}
        description={
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {assoc.bssaId && (
              <button onClick={() => copy(assoc.bssaId!, "BSSA ID")}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70">
                {assoc.bssaId} <Copy className="h-3 w-3 opacity-60" />
              </button>
            )}
            <AccountStatusBadge status={assoc.account?.status} />
            <Badge variant={assoc.isPublished ? "success" : "secondary"}>
              {assoc.isPublished ? "Published" : "Not published"}
            </Badge>
            <span className="text-sm text-muted-foreground">{assoc.state}</span>
          </div>
        }
      />

      {/* Suspension reason banner */}
      {status !== "ACTIVE" && assoc.account?.statusReason && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <span className="font-medium text-red-600">
            {status === "BLACKLISTED" ? "Blacklisted" : "Suspended"}:
          </span>{" "}
          {assoc.account.statusReason}
        </div>
      )}

      {/* Details card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Association details</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg border p-5 sm:grid-cols-2">
          {details.map((d) => (
            <div key={d.label}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</p>
              <p className="mt-0.5 text-sm">{d.value || <span className="text-muted-foreground">—</span>}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-5">
          <div className="mr-auto">
            <p className="text-sm font-medium">Public visibility</p>
            <p className="text-xs text-muted-foreground">
              {assoc.isPublished ? "Visible in the public directory." : "Hidden from the public directory."}
            </p>
          </div>
          <Button
            variant={assoc.isPublished ? "outline" : "default"}
            onClick={() => publishMutation.mutate(!assoc.isPublished)}
            disabled={publishMutation.isPending}
          >
            {assoc.isPublished ? "Unpublish" : "Publish"}
          </Button>

          {status === "ACTIVE" ? (
            <>
              <Button variant="outline" onClick={() => setModerating("SUSPENDED")}>
                <Ban className="mr-2 h-4 w-4" /> Suspend
              </Button>
              <Button variant="destructive" onClick={() => setModerating("BLACKLISTED")}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Blacklist
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setReactivating(true)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reactivate
              </Button>
              {status === "SUSPENDED" && (
                <Button variant="destructive" onClick={() => setModerating("BLACKLISTED")}>
                  <ShieldAlert className="mr-2 h-4 w-4" /> Blacklist
                </Button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Registered date footer */}
      <p className="text-xs text-muted-foreground">
        Registered {format(new Date(assoc.createdAt), "d MMM yyyy")}
        {assoc.account?.mobile && <> · {assoc.account.mobile}</>}
      </p>

      <ModerationDialog
        open={!!moderating}
        onOpenChange={(o) => !o && setModerating(null)}
        action={moderating}
        subjectName={assoc.name}
        onConfirm={async (reason) => {
          if (moderating) await statusMutation.mutateAsync({ status: moderating, reason });
        }}
      />
      <ConfirmDialog
        open={reactivating}
        onOpenChange={setReactivating}
        title="Reactivate association?"
        description={`${assoc.name} will be able to log in again and reappear in the public directory.`}
        confirmLabel="Reactivate"
        onConfirm={async () => { await statusMutation.mutateAsync({ status: "ACTIVE" }); }}
      />

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
