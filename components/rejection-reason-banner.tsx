import { XCircle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  reviewNote: string;
  reviewedAt: string | null;
}

export function RejectionReasonBanner({ reviewNote, reviewedAt }: Props) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <div className="mb-1 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
        <XCircle className="h-4 w-4" />
        Rejected
        {reviewedAt && (
          <span className="ml-auto text-xs font-normal text-amber-700/70 dark:text-amber-400/70">
            {format(new Date(reviewedAt), "d MMM yyyy, HH:mm")}
          </span>
        )}
      </div>
      <p className="text-amber-800 dark:text-amber-200">Reason shown to user: {reviewNote}</p>
    </div>
  );
}
