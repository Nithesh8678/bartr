"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginLogoutButton from "@/app/components/LoginLogoutButton";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Dashboard", href: "/Dashboard" },
  { name: "Profile", href: "/profile" },
  { name: "Skill Search", href: "/skillsearch" },
  { name: "Incoming Requests", href: "/incoming-requests" },
  { name: "Pending Requests", href: "/pending-requests" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Bartr</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Add search or other elements here if needed */}
          </div>
          <nav className="flex items-center">
            <LoginLogoutButton />
          </nav>
        </div>
      </div>
    </nav>
  );
}
