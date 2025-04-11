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
import WalletDisplay from "@/app/components/WalletDisplay";
import AddMoneyToWallet from "@/app/components/AddMoneyToWallet";

interface ProfileClientProps {
  initialUser: any;
  initialProfile: any;
}

export default function ProfileClient({
  initialUser,
  initialProfile,
}: ProfileClientProps) {
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to realtime updates for the user's profile
    const subscription = supabase
      .channel(`profile_changes_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Profile update received:", payload);
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-4">
        <Card>
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
                      <p className="text-muted-foreground">
                        {profile.location}
                      </p>
                    </div>
                  )}
                  {profile.timezone && (
                    <div>
                      <h3 className="font-medium">Timezone</h3>
                      <p className="text-muted-foreground">
                        {profile.timezone}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="mb-4">
                    You haven't completed your profile yet.
                  </p>
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
                <p suppressHydrationWarning className="text-muted-foreground">
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
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>

        {/* Wallet Section */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Manage your wallet balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WalletDisplay userId={user.id} />
            <AddMoneyToWallet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
