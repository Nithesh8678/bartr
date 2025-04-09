"use client";

import { createClient } from "@/app/utils/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error);
    window.location.href = "/error";
    return;
  }

  if (data.url) {
    window.location.href = data.url;
  }
}