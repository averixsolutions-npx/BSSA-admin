"use client";
import type { MemberMedia } from "@/lib/types";

export function MemberMediaGallery({ items }: { items: MemberMedia[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Member media</h2>
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
    </section>
  );
}
