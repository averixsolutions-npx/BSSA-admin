"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { dashboardService } from "@/lib/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Newspaper, Calendar, Users, Inbox } from "lucide-react";
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
    </div>
  );
}
