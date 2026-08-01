"use client";
import { ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  photoUrl?: string | null;
  /** Circle for people, square for organisations. */
  photoShape?: "circle" | "square";
  onPhotoClick?: () => void;
  /** Status badges — review state, account state, published. */
  badges?: React.ReactNode;
  /** Copyable identifiers — member ID, email, mobile. */
  chips?: React.ReactNode;
  /** One line of plain context, e.g. disciplines · state. */
  meta?: React.ReactNode;
}

/**
 * Identity strip at the top of a member profile. One card so the name, the
 * review state and the identifiers read as a single unit instead of three
 * stacked rows of loose text.
 */
export function ProfileHeaderCard({
  name,
  photoUrl,
  photoShape = "circle",
  onPhotoClick,
  badges,
  chips,
  meta,
}: Props) {
  const shape = photoShape === "circle" ? "rounded-full" : "rounded-lg";

  const photo = (
    <span className={cn("block h-16 w-16 shrink-0 overflow-hidden border bg-muted", shape)}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageOff className="h-5 w-5" />
        </span>
      )}
    </span>
  );

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      {photoUrl && onPhotoClick ? (
        <button type="button" onClick={onPhotoClick} title="Open photo" className="shrink-0">
          {photo}
        </button>
      ) : (
        photo
      )}

      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">{name}</h1>
        {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
        {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
        {chips && <div className="flex flex-wrap items-center gap-1.5 pt-1">{chips}</div>}
      </div>
    </Card>
  );
}
