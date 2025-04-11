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
import Image from "next/image";

const navItems = [
  { name: "Home", href: "/" },
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
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className="w-full max-w-6xl mx-auto border border-border bg-[#2A0EFF] backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-lg">
        <div className="container flex h-12 items-center justify-between p-4 bg-[#2A0EFF] rounded-lg">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/assets/bartr. 1.png" alt="Logo" width={60} height={60} />
          </Link>
          
          <div className="flex items-center space-x-4">
            {user && (
              <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "transition-colors hover:text-foreground/80",
                      pathname === item.href
                        ? "text-foreground"
                        : "text-white"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}
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
    </div>
  );
}
