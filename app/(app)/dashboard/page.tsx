"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { dashboardService } from "@/lib/services/dashboard";
import { useQueueCounts } from "@/components/hooks/use-queue-counts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, Calendar, CheckCircle2, Inbox, Newspaper, UserCog, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CardTheme = {
  gradient: string; // card background wash
  iconWrap: string; // colored tile behind the icon
  iconColor: string;
};

const THEMES = {
  news:      { gradient: "from-blue-500/10 via-blue-500/5 to-transparent",       iconWrap: "bg-blue-500/15",    iconColor: "text-blue-600 dark:text-blue-400" },
  events:    { gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent", iconWrap: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400" },
  athletes:  { gradient: "from-violet-500/10 via-violet-500/5 to-transparent",   iconWrap: "bg-violet-500/15",  iconColor: "text-violet-600 dark:text-violet-400" },
  enquiries: { gradient: "from-amber-500/10 via-amber-500/5 to-transparent",     iconWrap: "bg-amber-500/15",   iconColor: "text-amber-600 dark:text-amber-400" },
} satisfies Record<string, CardTheme>;

export default function DashboardPage() {
  const { admin } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardService.getStats,
    refetchInterval: 60_000, // refresh every minute
  });

  const athleteQueue = useQueueCounts("athletes");
  const associationQueue = useQueueCounts("associations");

  const cards = [
    { key: "news",      title: "Published news",      value: data?.publishedNews,      icon: Newspaper, description: "Live articles",  href: "/news" },
    { key: "events",    title: "Upcoming events",     value: data?.upcomingEvents,     icon: Calendar,  description: "Scheduled",      href: "/events" },
    { key: "athletes",  title: "Registered athletes", value: data?.registeredAthletes, icon: Users,     description: "All-time",       href: "/athletes" },
    { key: "enquiries", title: "Enquiries",           value: data?.totalEnquiries,     icon: Inbox,     description: "Total received", href: "/enquiries" },
  ] satisfies { key: keyof typeof THEMES; [k: string]: unknown }[];

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back{admin?.username ? `, ${admin.username}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening on the site.</p>
      </div>

      {/* The queue comes first — it's the work only an admin can do. */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Needs your review
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <QueueCard
            label="Athlete submissions"
            count={athleteQueue.data?.PENDING}
            icon={UserCog}
            href="/athletes?bucket=PENDING"
          />
          <QueueCard
            label="Association submissions"
            count={associationQueue.data?.PENDING}
            icon={Building2}
            href="/associations?bucket=PENDING"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          At a glance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => {
            const theme = THEMES[c.key];
            return (
              <Link
                key={c.title}
                href={c.href}
                className={cn(
                  "group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "animate-in fade-in slide-in-from-bottom-2 duration-500"
                )}
                // Stagger the entry: 0ms, 75ms, 150ms, 225ms.
                style={{ animationDelay: `${i * 75}ms`, animationFillMode: "backwards" }}
              >
                <Card
                  className={cn(
                    "relative h-full overflow-hidden border-border/60",
                    "bg-gradient-to-br", theme.gradient,
                    "transition-all duration-300",
                    "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40"
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription className="font-medium">{c.title}</CardDescription>
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", theme.iconWrap)}>
                      <c.icon className={cn("h-4 w-4", theme.iconColor)} />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-3xl font-bold tabular-nums">{c.value ?? "—"}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                  </CardContent>
                  {/* Corner sheen on hover */}
                  <span
                    className={cn(
                      "pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full",
                      "bg-primary/5 blur-2xl opacity-0 transition-opacity duration-300",
                      "group-hover:opacity-100"
                    )}
                  />
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** One review queue. Zero is a good state, so it reads as done, not empty. */
function QueueCard({
  label,
  count,
  icon: Icon,
  href,
}: {
  label: string;
  count?: number;
  icon: LucideIcon;
  href: string;
}) {
  const waiting = (count ?? 0) > 0;

  return (
    <Link
      href={href}
      className="group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card
        className={cn(
          "flex h-full items-center gap-4 p-4 transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-md",
          waiting ? "border-amber-500/40 bg-amber-500/5" : "border-border/60"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
            waiting
              ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
          )}
        >
          {waiting ? <Icon className="h-[18px] w-[18px]" /> : <CheckCircle2 className="h-[18px] w-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {count === undefined ? "Checking…" : waiting ? "Waiting for a verdict" : "Nothing waiting"}
          </p>
        </div>
        {waiting && <Badge variant="warning">{count}</Badge>}
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
      </Card>
    </Link>
  );
}
