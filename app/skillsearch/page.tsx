"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SkillsInput from "@/app/components/SkillsInput";
import { toast } from "sonner";

// Popular skills array
const popularSkills = [
  "Web Development",
  "Graphic Design",
  "Content Writing",
  "Data Analysis",
  "Marketing",
  "Translation",
  "Video Editing",
  "UI/UX Design",
];

export default function SkillSearchPage() {
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async () => {
    if (skillsNeeded.length === 0) {
      toast.error("Please add at least one skill you need");
      return;
    }

    setIsLoading(true);
    setErrorDetails(null);

    try {
      console.log("Sending skills to API:", skillsNeeded);

      const response = await fetch("/api/saveNeededSkills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skillsNeeded }),
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        const errorMessage =
          data.details || data.error || "Failed to save skills";
        setErrorDetails(errorMessage);
        throw new Error(errorMessage);
      }

      toast.success("Skills saved successfully");
      router.push("/browse");
    } catch (error) {
      console.error("Error saving skills:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save skills";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a popular skill to the skillsNeeded array
  const addPopularSkill = (skill: string) => {
    if (!skillsNeeded.includes(skill)) {
      setSkillsNeeded([...skillsNeeded, skill]);
      toast.success(`Added "${skill}" to your search`);
    } else {
      toast.info(`"${skill}" is already in your search`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header Section with Solid Blue */}
      <div className="relative w-full h-[410px] bg-[#242FFF]">
        <div
          className="absolute inset-0 bg-grid-white/10"
          style={{
            backgroundSize: "10px 10px",
            backgroundImage:
              "linear-gradient(to right,rgba(255,255,255,0.1) 1px,transparent 1px), linear-gradient(to bottom,rgba(255,255,255,0.1) 1px,transparent 1px)",
          }}
        />
      </div>

      {/* Main Content with Search Bar - Move to top */}
      <div className="container mx-auto px-4 -mt-60 relative z-10">
        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center text-[#242FFF]">
              Search for skills
            </h2>
            <div className="space-y-4">
              <SkillsInput
                label="Skills You Need"
                skills={skillsNeeded}
                setSkills={setSkillsNeeded}
                backgroundColor="bg-[#242FFF]/10"
                textColor="text-[#242FFF]"
              />

              {errorDetails && (
                <div className="p-3 bg-red-900/50 text-red-200 rounded-md">
                  <p className="font-semibold">Error Details:</p>
                  <p className="text-sm">{errorDetails}</p>
                </div>
              )}

              <button
                className="w-full bg-[#242FFF] hover:bg-[#1A0EDF] py-3 rounded-lg transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-white"
                onClick={handleSearch}
                disabled={isLoading || skillsNeeded.length === 0}
              >
                {isLoading ? "Searching..." : "Search Skills"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Choices Section - Move below the search bar */}
      <div className="container mx-auto px-4 mb-12 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-[#242FFF] mb-4">
            Popular Choices
          </h3>
          <div className="flex flex-wrap gap-2">
            {popularSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => addPopularSkill(skill)}
                className="px-4 py-2 bg-[#242FFF]/10 hover:bg-[#242FFF]/20 text-[#242FFF] rounded-full transition-colors font-medium text-sm"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
