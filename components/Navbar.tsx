"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LoginLogoutButton from "@/app/components/LoginLogoutButton";
import { cn } from "@/lib/utils";
import SignInWithGoogleButton from "@/app/components/SignInWithGoogleButton";
import { useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useEffect } from "react";
import { Button } from "./ui/button";

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
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [router]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-6xl mx-auto items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Bartr</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {user &&
              navItems.map((item) => (
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
            {user ? (
              <Button
                onClick={() => {
                  supabase.auth.signOut().then(() => {
                    router.push("/");
                  });
                }}
              >
                Logout
              </Button>
            ) : (
              <SignInWithGoogleButton />
            )}
          </nav>
        </div>
      </div>
    </nav>
  );
}
