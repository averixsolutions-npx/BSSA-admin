import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ContentStatus | boolean;
  publishedLabel?: string;
  draftLabel?: string;
}

export function StatusBadge({
  status,
  publishedLabel = "Published",
  draftLabel = "Draft",
}: StatusBadgeProps) {
  const isPublished =
    typeof status === "boolean" ? status : status === "PUBLISHED";

  return (
    <Badge variant={isPublished ? "success" : "secondary"}>
      {isPublished ? publishedLabel : draftLabel}
    </Badge>
  );
}
