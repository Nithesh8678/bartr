"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LoginLogoutButton from "@/app/components/LoginLogoutButton";
import { cn } from "@/lib/utils";
import SignInWithGoogleButton from "@/app/components/SignInWithGoogleButton";
import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "./ui/button";
import Image from "next/image";
import { MessageSquare, Bell } from "lucide-react";
import { useSidebar } from "@/app/context/SidebarContext";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Profile", href: "/profile" },
  { name: "Skill Search", href: "/skillsearch" },
  { name: "Dashboard", href: "/Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const supabase = createClient();
  const router = useRouter();
  const { toggleRequestsSidebar } = useSidebar();
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch pending requests count
        const { count } = await supabase
          .from("pending_requests")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("status", "pending");

        setPendingCount(count || 0);
      }
    };
    fetchUser();

    // Set up real-time subscription for pending requests
    if (user) {
      const subscription = supabase
        .channel("pending_requests_count")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pending_requests",
            filter: `receiver_id=eq.${user.id}`,
          },
          async () => {
            // Update pending requests count
            const { count } = await supabase
              .from("pending_requests")
              .select("*", { count: "exact", head: true })
              .eq("receiver_id", user.id)
              .eq("status", "pending");

            // Trigger animation when count increases
            const newCount = count || 0;
            if (newCount > pendingCount) {
              setHasNew(true);
              setTimeout(() => setHasNew(false), 3000); // Reset after animation
            }

            setPendingCount(newCount);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user, pendingCount]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className="w-full max-w-6xl mx-auto border border-[#2A0EFF]/10 bg-[#2A0EFF] backdrop-blur shadow-black/20 supports-[backdrop-filter]:bg-background/60 rounded-lg shadow-md">
        <div className="container flex h-12 items-center justify-between p-4 bg-[#2A0EFF] rounded-lg">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/assets/bartr. 1.png"
              alt="Logo"
              width={60}
              height={60}
            />
          </Link>

          {user && (
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-white/80 relative group",
                    pathname === item.href ? "text-white" : "text-white"
                  )}
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center space-x-3">
            {user && (
              <motion.button
                onClick={toggleRequestsSidebar}
                className="relative text-white p-2 rounded-full hover:bg-[#242FFF]/20 transition-colors"
                aria-label="Requests"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={
                  hasNew
                    ? {
                        rotate: [0, -10, 10, -10, 10, 0],
                        transition: {
                          duration: 0.5,
                          repeat: 2,
                        },
                      }
                    : {}
                }
              >
                <Bell size={20} />
                <AnimatePresence>
                  {pendingCount > 0 && (
                    <motion.span
                      className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
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
