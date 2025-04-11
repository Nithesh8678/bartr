import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ProfileClient from "./ProfileClient";
import Loading from "./loading";

export default async function ProfilePage() {
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

  return (
    <div className="min-h-screen">
      <Suspense fallback={<Loading />}>
        <ProfileClient initialUser={user} initialProfile={userProfile} />
      </Suspense>
    </div>
  );
}
