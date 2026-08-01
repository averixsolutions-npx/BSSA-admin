import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Inline alert — for things that are *true about what you're looking at*.
 * Something that just *happened* is a `sonner` toast instead (P5).
 */
const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border p-4 text-sm [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-blue-500/30 bg-blue-500/5 text-foreground [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        warning:
          "border-amber-500/30 bg-amber-500/5 text-foreground [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        success:
          "border-emerald-500/30 bg-emerald-500/5 text-foreground [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        destructive:
          "border-red-500/30 bg-red-500/5 text-foreground [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-medium leading-snug", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm leading-snug text-muted-foreground", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
