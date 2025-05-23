"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { getUserSkills } from "@/lib/services/user-skills";
import SkillsInput from "@/app/components/SkillsInput";

export default function CreateProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    timezone: "",
  });
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        // Pre-fill form with existing data
        setFormData({
          name: existingProfile.name || "",
          bio: existingProfile.bio || "",
          location: existingProfile.location || "",
          timezone: existingProfile.timezone || "",
        });

        // Get user skills
        const { offeredSkills } = await getUserSkills(user.id);
        if (offeredSkills.length > 0) setSkillsOffered(offeredSkills);
      }
    };

    getUser();
  }, [router, supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      console.error("User not found, cannot submit profile.");
      alert("Authentication error. Please log in again.");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data for the API
      const profileData = {
        userId: user.id,
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        timezone: formData.timezone,
        offeredSkills: skillsOffered,
        neededSkills: [], // Keep this empty array to maintain API compatibility
      };

      // Call the /api/saveProfile endpoint
      console.log("Sending data to /api/saveProfile:", profileData);
      const response = await fetch("/api/saveProfile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const responseData = await response.json();
      console.log("Received response from /api/saveProfile:", responseData);

      if (!response.ok) {
        console.error("API response error:", responseData);
        // Use the error details from the API response
        throw new Error(
          responseData.details || responseData.error || "Failed to save profile"
        );
      }

      // Display success message and redirect to /browse
      console.log("Profile saved successfully:", responseData.message);
      alert("Profile saved successfully! Redirecting..."); // Simple alert for now
      router.push("/browse"); // <-- Changed redirect destination
    } catch (error) {
      console.error("Error submitting profile:", error);
      // Display the error message from the API or a generic one
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert("An unknown error occurred while saving the profile.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkDatabase = async () => {
    try {
      setIsCheckingDb(true);
      const response = await fetch("/api/debug");
      const data = await response.json();
      setDbInfo(data);
      console.log("Database info:", data);
    } catch (error) {
      console.error("Error checking database:", error);
    } finally {
      setIsCheckingDb(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Profile</CardTitle>
          <CardDescription>
            Fill in your details to complete your profile and start using Bartr
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Your city or country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                placeholder="e.g. UTC+5:30"
              />
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">Your Skills</h3>
              <SkillsInput
                label="Skills You Offer"
                skills={skillsOffered}
                setSkills={setSkillsOffered}
                backgroundColor="bg-primary/10"
                textColor="text-primary"
              />

              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-blue-800">
                <p className="text-sm">
                  Looking for skills? Go to the{" "}
                  <a href="/skillsearch" className="font-medium underline">
                    Skill Search
                  </a>{" "}
                  page to find people with the skills you need.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={checkDatabase}
            className="w-full"
            disabled={isCheckingDb}
          >
            {isCheckingDb ? "Checking Database..." : "Check Database Structure"}
          </Button>

          {dbInfo && (
            <div className="w-full mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-64">
              <pre className="text-xs">{JSON.stringify(dbInfo, null, 2)}</pre>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
