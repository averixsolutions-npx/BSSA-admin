"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { dashboardService } from "@/lib/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Newspaper, Calendar, Users, Inbox } from "lucide-react";

export default function DashboardPage() {
  const { admin } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardService.getStats,
    refetchInterval: 60_000, // refresh every minute
  });

  const cards = [
    { title: "Published news", value: data?.publishedNews, icon: Newspaper, description: "Live articles" },
    { title: "Upcoming events", value: data?.upcomingEvents, icon: Calendar, description: "Scheduled" },
    { title: "Registered athletes", value: data?.registeredAthletes, icon: Users, description: "All-time" },
    { title: "Enquiries", value: data?.totalEnquiries, icon: Inbox, description: "Total received" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back{admin?.username ? `, ${admin.username}` : ""}
        </h1>
        <p className="text-muted-foreground">Here's what's happening on the site.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{c.title}</CardDescription>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl">{c.value ?? "—"}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
