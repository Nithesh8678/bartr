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
import Image from "next/image";
import SkillsInput from "@/app/components/SkillsInput";

// Add color array for skills
const skillColors = [
  { bg: "#FFE2E2", text: "#FF4D4D" }, // Red
  { bg: "#E2FFE9", text: "#00CC66" }, // Green
  { bg: "#E2F0FF", text: "#0066FF" }, // Blue
  { bg: "#FFF3E2", text: "#FF9933" }, // Orange
  { bg: "#F3E2FF", text: "#9933FF" }, // Purple
  { bg: "#E2FFFA", text: "#00CCCC" }, // Cyan
  { bg: "#FFE2F6", text: "#FF33CC" }, // Pink
  { bg: "#FFF9E2", text: "#FFCC00" }, // Yellow
];

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
  const [skills, setSkills] = useState<string[]>(initialProfile?.skills || []);
  const [isEditing, setIsEditing] = useState(false);
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

  const handleSaveSkills = async () => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ skills: skills })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({ ...profile, skills });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving skills:", error);
      alert("Failed to save skills. Please try again.");
    }
  };

  return (
    <div className="w-full">
      {/* Header Section with Solid Blue */}
      <div className="relative w-full h-[400px] bg-[#2A0EFF]">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4">
          
          <div className="flex items-end gap-6 pt-20 px-10">
            <div className="relative w-40 h-40 rounded-full border-4 border-white overflow-hidden bg-white">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-20 h-20 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-white mb-4">
                {profile?.name || "Complete Your Profile"}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 flex-wrap">
                  {profile?.skills?.map((skill: string, index: number) => {
                    const colorIndex = index % skillColors.length;
                    const { bg, text } = skillColors[colorIndex];
                    return (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: bg, color: text }}
                      >
                        {skill}
                      </span>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer z-10"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Skills
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-4 -mt-32 relative z-10">
        {isEditing ? (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white shadow-2xl border border-[#2A0EFF]/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-[#2A0EFF]">Edit Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillsInput
                  label="Your Skills"
                  skills={skills}
                  setSkills={setSkills}
                  backgroundColor="bg-[#2A0EFF]/10"
                  textColor="text-[#2A0EFF]"
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSkills}
                  className="bg-[#2A0EFF] hover:bg-[#1A0EDF] text-white"
                >
                  Save Skills
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-2xl border border-[#2A0EFF]/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-[#2A0EFF]">About</CardTitle>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="space-y-4">
                    {profile.email && (
                      <div>
                        <h3 className="font-medium text-[#2A0EFF]">Email</h3>
                        <p className="text-gray-600">{profile.email}</p>
                      </div>
                    )}
                    {profile.location && (
                      <div>
                        <h3 className="font-medium text-[#2A0EFF]">Location</h3>
                        <p className="text-gray-600">{profile.location}</p>
                      </div>
                    )}
                    {profile.timezone && (
                      <div>
                        <h3 className="font-medium text-[#2A0EFF]">Timezone</h3>
                        <p className="text-gray-600">{profile.timezone}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="mb-4 text-gray-600">
                      You haven't completed your profile yet.
                    </p>
                    <Link href="/profile/create">
                      <Button className="bg-[#2A0EFF] hover:bg-[#2A0EFF]/90 text-white">
                        Create Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white shadow-2xl border border-[#2A0EFF]/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-[#2A0EFF]">Wallet</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <WalletDisplay userId={user.id} />
                <AddMoneyToWallet />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
