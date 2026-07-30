"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav-config";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { ORG_NAME } from "@/lib/brand";
import { useQueueCounts } from "./hooks/use-queue-counts";

// Nav hrefs that show a pending-review count pill.
const QUEUE_HREFS: Record<string, "athletes" | "associations"> = {
  "/athletes": "athletes",
  "/associations": "associations",
};

function NavPendingPill({ href }: { href: string }) {
  const role = QUEUE_HREFS[href];
  const { data } = useQueueCounts(role!);
  const count = data?.PENDING ?? 0;
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
      {count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex md:w-64 md:flex-col",
        "border-r border-border/60",
        "bg-gradient-to-b from-card via-card to-accent/30",
        "shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.4)]"
      )}
    >
      <div className="flex h-16 items-center border-b border-border/60 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold min-w-0">
          <Image
            src="/logo.jpeg"
            alt={ORG_NAME}
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-cover shrink-0"
            priority
          />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-sm truncate" title={ORG_NAME}>{ORG_NAME}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</span>
          </span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                        "transition-all duration-200",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/70" />
                      )}
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {QUEUE_HREFS[item.href] && <NavPendingPill href={item.href} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
