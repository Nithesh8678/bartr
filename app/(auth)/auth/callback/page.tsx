"use client";

import { useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
        router.push("/error");
        return;
      }

      if (session?.user?.email) {
        // Get user details from the session
        const { user } = session;
        
        // Check if user already exists in users_duplicate table
        const { data: existingUser, error: checkError } = await supabase
          .from('users_duplicate')
          .select('id')
          .eq('email', user.email)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error("Error checking existing user:", checkError);
          router.push("/error");
          return;
        }

        // If user doesn't exist, insert them
        if (!existingUser) {
          const { error: insertError } = await supabase
            .from('users_duplicate')
            .insert([
              {
                id: user.id,
                name: user.user_metadata?.full_name || (user.email as string).split('@')[0],
                email: user.email
              }
            ]);

          if (insertError) {
            console.error("Error inserting user:", insertError);
            router.push("/error");
            return;
          }
        }

        router.push("/profile");
      } else {
        router.push("/login");
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Processing your login...</h1>
        <p className="text-muted-foreground">Please wait while we redirect you.</p>
      </div>
    </div>
  );
} 