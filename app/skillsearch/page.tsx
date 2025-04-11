"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SkillsInput from "@/app/components/SkillsInput";
import { toast } from "sonner";

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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Bartr Skill Search</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300">Find your perfect match</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-8 shadow-lg">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">
              Search Your Needed Skill
            </h2>
            <div className="space-y-4">
              <SkillsInput
                label="Skills You Need"
                skills={skillsNeeded}
                setSkills={setSkillsNeeded}
                backgroundColor="bg-secondary/10"
                textColor="text-secondary"
              />

              {errorDetails && (
                <div className="p-3 bg-red-900/50 text-red-200 rounded-md">
                  <p className="font-semibold">Error Details:</p>
                  <p className="text-sm">{errorDetails}</p>
                </div>
              )}

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSearch}
                disabled={isLoading || skillsNeeded.length === 0}
              >
                {isLoading ? "Searching..." : "Search Skills"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
