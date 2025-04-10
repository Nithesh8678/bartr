"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUser(user);

        // Get user profile if it exists
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (userProfile) {
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Profile</CardTitle>
          <CardDescription>
            {profile
              ? "Your Bartr profile"
              : "Complete your profile to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile ? (
              <>
                <div>
                  <h3 className="font-medium">Name</h3>
                  <p className="text-muted-foreground">{profile.name}</p>
                </div>
                {profile.bio && (
                  <div>
                    <h3 className="font-medium">Bio</h3>
                    <p className="text-muted-foreground">{profile.bio}</p>
                  </div>
                )}
                {profile.location && (
                  <div>
                    <h3 className="font-medium">Location</h3>
                    <p className="text-muted-foreground">{profile.location}</p>
                  </div>
                )}
                {profile.timezone && (
                  <div>
                    <h3 className="font-medium">Timezone</h3>
                    <p className="text-muted-foreground">{profile.timezone}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="mb-4">You haven't completed your profile yet.</p>
                <Link href="/profile/create">
                  <Button>Create Profile</Button>
                </Link>
              </div>
            )}

            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <h3 className="font-medium">Account Created</h3>
              <p className="text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {profile && (
            <Link href="/profile/create" className="w-full">
              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
            </Link>
          )}
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
