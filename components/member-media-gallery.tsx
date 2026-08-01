"use client";
import { Images } from "lucide-react";
import type { MemberMedia } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";

/** Member-uploaded gallery — read-only for admins, so it folds away by default. */
export function MemberMediaGallery({ items }: { items: MemberMedia[] }) {
  return (
    <SectionCard
      title="Member media"
      description={
        items.length > 0
          ? `${items.length} item${items.length === 1 ? "" : "s"} uploaded by the member.`
          : "Photos and clips the member has uploaded."
      }
      icon={Images}
      tone="slate"
      collapsible
      defaultOpen={false}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No media uploaded"
          description="Anything the member adds to their public gallery shows up here."
          variant="inline"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="aspect-video bg-muted">
                {m.kind === "IMAGE" && m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt={m.caption ?? ""} className="h-full w-full object-cover" />
                ) : m.sourceUrl ? (
                  <a
                    href={m.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full w-full items-center justify-center text-xs underline"
                  >
                    {m.platform ?? "Video"} ↗
                  </a>
                ) : null}
              </div>
              {m.caption && <p className="px-2 py-1 text-xs text-muted-foreground">{m.caption}</p>}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
