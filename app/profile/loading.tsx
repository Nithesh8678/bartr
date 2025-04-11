import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import LoadingClient from "./LoadingClient";

export default async function Loading() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Get user profile if it exists
  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return <LoadingClient initialUser={user} initialProfile={userProfile} />;
}
