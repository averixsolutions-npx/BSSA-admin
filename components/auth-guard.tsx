"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isBooting, boot } = useAuthStore();

  // Kick off the boot process on mount
  useEffect(() => {
    boot();
  }, [boot]);

  // Redirect to login if we're done booting and still unauthenticated
  useEffect(() => {
    if (!isBooting && !isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isBooting, isAuthenticated, pathname, router]);

  if (isBooting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // useEffect above is redirecting
  }

  return <>{children}</>;
}
