"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 md:hidden data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82%] flex-col bg-card shadow-lg border-r md:hidden focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Dialog.Title className="flex items-center gap-2 font-semibold">
              <Image
                src="/logo.jpeg"
                alt="BSSA"
                width={32}
                height={32}
                className="h-8 w-8 rounded-md object-cover"
              />
              BSSA Admin
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
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
                        onClick={() => setOpen(false)}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
