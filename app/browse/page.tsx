"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";

// Define the structure for user profiles fetched from the API
interface Skill {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  name: string;
  bio?: string;
  profile_image_url?: string;
  location?: string;
  timezone?: string;
  skillsOffered: Skill[];
  skillsNeeded: Skill[];
}

const SWIPE_THRESHOLD = 80;

export default function BrowsePage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/browse-users");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch users");
        }
        const data: UserProfile[] = await response.json();
        setUsers(data);
        setCurrentIndex(data.length - 1); // Start from the "top" of the stack
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSwipe = (swipeDirection: "like" | "skip") => {
    setDirection(swipeDirection === "like" ? "right" : "left");
    // Add logic here to record the swipe action (e.g., call an API)
    console.log(`Swiped ${swipeDirection} on user:`, users[currentIndex]?.id);

    // Use setTimeout to allow animation to start before removing the card
    setTimeout(() => {
      if (currentIndex >= 0) {
        setCurrentIndex(currentIndex - 1);
        setDirection(null); // Reset direction after animation
      }
    }, 300); // Duration should roughly match animation duration
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeDistance = info.offset.x;
    const swipeVelocity = info.velocity.x;

    if (
      Math.abs(swipeDistance) > SWIPE_THRESHOLD ||
      Math.abs(swipeVelocity) > 400
    ) {
      handleSwipe(swipeDistance > 0 ? "like" : "skip");
    } else {
      // If not swiped far enough, don't trigger state change (card snaps back)
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 50, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: (direction: "left" | "right" | null) => ({
      x: direction === "left" ? -300 : direction === "right" ? 300 : 0,
      opacity: 0,
      scale: 0.7,
      transition: { duration: 0.3 },
    }),
  };

  const renderSkills = (
    skills: Skill[],
    label: string,
    bgColor: string,
    textColor: string
  ) => {
    if (!skills || skills.length === 0) return null;
    return (
      <div className="mb-3">
        <h4 className="text-sm font-semibold mb-1 text-gray-600">{label}:</h4>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill.id}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
            >
              {skill.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const currentProfile = users[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 overflow-hidden">
      {isLoading && (
        <div className="flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p>Finding potential matches...</p>
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
          <p>Error loading users: {error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            <RotateCcw className="mr-2 h-4" /> Try Again
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="relative w-full max-w-sm h-[70vh] flex items-center justify-center">
          {/* Stacked Cards - Only render top few for performance if needed */}
          <AnimatePresence initial={false} custom={direction}>
            {currentIndex >= 0 ? (
              <motion.div
                key={currentIndex} // Ensures animation runs on change
                className="absolute w-full h-full"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction} // Pass direction to exit variant
                drag="x"
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragEnd={handleDragEnd}
                dragElastic={0.7} // Adds a bit of bounce
              >
                <Card className="w-full h-full flex flex-col overflow-hidden shadow-xl border border-gray-300 rounded-2xl bg-white">
                  {/* Optional Profile Image */}
                  {currentProfile.profile_image_url ? (
                    <img
                      src={currentProfile.profile_image_url}
                      alt={`${currentProfile.name || "User"}'s profile picture`}
                      className="w-full h-48 object-cover" // Adjust height as needed
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
                      {/* Placeholder Icon or Text */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                  <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl font-bold">
                      {currentProfile.name || "Unnamed User"}
                    </CardTitle>
                    {(currentProfile.location || currentProfile.timezone) && (
                      <CardDescription className="text-xs text-gray-500">
                        {currentProfile.location}
                        {currentProfile.location && currentProfile.timezone
                          ? ", "
                          : ""}
                        {currentProfile.timezone}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {currentProfile.bio && (
                      <p className="text-sm text-gray-700 mb-4">
                        {currentProfile.bio}
                      </p>
                    )}
                    {renderSkills(
                      currentProfile.skillsOffered,
                      "Offers",
                      "bg-blue-100",
                      "text-blue-800"
                    )}
                    {renderSkills(
                      currentProfile.skillsNeeded,
                      "Needs",
                      "bg-green-100",
                      "text-green-800"
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-lg">No more profiles to show!</p>
                <p className="text-sm mt-1">Check back later.</p>
                {/* Option to reload or go elsewhere */}
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reload
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && !error && currentIndex >= 0 && (
        <div className="flex justify-center gap-6 mt-6">
          <Button
            onClick={() => handleSwipe("skip")}
            variant="outline"
            size="lg"
            className="rounded-full h-16 w-16 p-0 border-2 border-red-500 text-red-500 hover:bg-red-50 focus:ring-red-300 shadow-md"
          >
            <ThumbsDown className="h-7 w-7" />
          </Button>
          <Button
            onClick={() => handleSwipe("like")}
            variant="outline"
            size="lg"
            className="rounded-full h-16 w-16 p-0 border-2 border-green-500 text-green-500 hover:bg-green-50 focus:ring-green-300 shadow-md"
          >
            <ThumbsUp className="h-7 w-7" />
          </Button>
        </div>
      )}
    </div>
  );
}
