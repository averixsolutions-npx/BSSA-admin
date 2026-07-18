"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav-config";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">N</span>
          </div>
          <span>NWSF Admin</span>
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
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
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
