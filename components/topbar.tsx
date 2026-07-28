"use client";
import { useRouter } from "next/navigation";
import { LogOut, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { MobileNav } from "./mobile-nav";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

export function Topbar() {
  const router = useRouter();
  const { admin, logout } = useAuthStore();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out");
      router.replace("/login");
    } catch {
      toast.error("Could not log out — try again");
    }
  };

  const initials =
    admin?.username?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <span className="text-sm text-muted-foreground">Admin panel</span>
      </div>
      <div className="flex items-center gap-2">
        {siteUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={siteUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              View site
            </a>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{admin?.username ?? "Admin"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
