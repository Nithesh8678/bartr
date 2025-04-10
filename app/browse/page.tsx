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
import {
  Loader2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  BrainCircuit,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import Link from "next/link";

// Define the structure for AI Match results
interface AiMatchResult {
  userId: string;
  name: string;
  bio: string;
  skills_offered: string[]; // Gemini returns skill names
  relevance_score: number;
}

const SWIPE_THRESHOLD = 80;

export default function BrowsePage() {
  const [users, setUsers] = useState<AiMatchResult[]>([]); // State now holds AiMatchResult
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [isProcessingSwipe, setIsProcessingSwipe] = useState(false);

  useEffect(() => {
    const fetchAiMatches = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Call the AI Match API via POST (even though no body needed for GET logic)
        const response = await fetch("/api/aiMatch", { method: "POST" });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch AI matches");
        }
        const data: AiMatchResult[] = await response.json();
        console.log("Received AI Matches:", data);
        setUsers(data); // Set the ranked list from the API
        setCurrentIndex(data.length > 0 ? data.length - 1 : -1); // Start from the top, or -1 if empty
      } catch (err) {
        console.error("Fetch AI Matches error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setCurrentIndex(-1); // Ensure no cards render on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchAiMatches();
  }, []);

  const handleSwipe = async (swipeDirection: "like" | "skip") => {
    if (isProcessingSwipe || currentIndex < 0) return; // Prevent multiple calls or swiping on empty state

    const swipedUser = users[currentIndex];
    if (!swipedUser) return;

    setIsProcessingSwipe(true); // Disable buttons
    setDirection(swipeDirection === "like" ? "right" : "left"); // Start animation

    try {
      console.log(
        `Sending swipe: ${swipeDirection} on user:`,
        swipedUser.userId
      );
      const response = await fetch("/api/swipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          swipedUserId: swipedUser.userId, // Use userId from AiMatchResult
          direction: swipeDirection,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Swipe API Error:", result);
        throw new Error(
          result.details || result.error || "Failed to record swipe"
        );
      }

      console.log("Swipe successful:", result);
      if (result.matchCreated) {
        console.log("🎉 It's a Match!");
        // Show toast notification with a link
        toast.success(
          <div className="flex flex-col">
            <span>🎉 It's a Match!</span>
            <Link
              href="/chat"
              className="mt-1 text-sm text-blue-600 hover:underline"
            >
              Go to Chat
            </Link>
          </div>
        );
      }
    } catch (err) {
      console.error("Error during swipe action:", err);
      // Optionally show an error toast
      toast.error(
        err instanceof Error ? err.message : "Could not record swipe"
      );
      setDirection(null); // Reset animation direction if API fails
      setIsProcessingSwipe(false); // Re-enable buttons
      return; // Don't proceed to next card if swipe failed
    }

    // Use setTimeout to allow animation to start before removing the card
    setTimeout(() => {
      if (currentIndex >= 0) {
        setCurrentIndex((prevIndex) => prevIndex - 1);
        setDirection(null); // Reset direction after animation
      }
      setIsProcessingSwipe(false); // Re-enable buttons after animation delay
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
    skills: string[],
    label: string,
    bgColor: string,
    textColor: string
  ) => {
    if (!skills || skills.length === 0) return null;
    return (
      <div className="mb-3">
        <h4 className="text-sm font-semibold mb-1 text-gray-600">{label}:</h4>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skillName) => (
            <span
              key={skillName} // Use name as key since we only have names now
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
            >
              {skillName}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const currentProfile = users[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 overflow-hidden">
      <Toaster position="top-center" richColors />
      {isLoading && (
        <div className="flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p>Finding AI-powered matches...</p> {/* Updated loading text */}
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
            <RotateCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="relative w-full max-w-sm h-[70vh] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction}>
            {currentIndex >= 0 && currentProfile ? (
              <motion.div
                key={currentIndex}
                className="absolute w-full h-full"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
                drag="x"
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragEnd={handleDragEnd}
                dragElastic={0.7}
              >
                <Card className="w-full h-full flex flex-col overflow-hidden shadow-xl border border-gray-300 rounded-2xl bg-white">
                  {/* Removed profile image for simplicity, can be added back if needed */}
                  <CardHeader className="p-4 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold">
                          {currentProfile.name || "Unnamed User"}
                        </CardTitle>
                        {/* Removed location/timezone display for simplicity */}
                      </div>
                      <span className="flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                        <BrainCircuit className="h-3 w-3 mr-1" /> Score:{" "}
                        {currentProfile.relevance_score}/10
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {currentProfile.bio && (
                      <p className="text-sm text-gray-700 mb-4">
                        {currentProfile.bio}
                      </p>
                    )}
                    {/* Pass skills_offered which is string[] */}
                    {renderSkills(
                      currentProfile.skills_offered,
                      "Offers",
                      "bg-blue-100",
                      "text-blue-800"
                    )}
                    {/* We don't display needed skills on the swipe card usually */}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-lg">No more profiles to show!</p>
                <p className="text-sm mt-1">
                  Check back later or adjust your needed skills.
                </p>
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
            className="rounded-full h-16 w-16 p-0 border-2 border-red-500 text-red-500 hover:bg-red-50 focus:ring-red-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessingSwipe} // Disable button during processing
          >
            <ThumbsDown className="h-7 w-7" />
          </Button>
          <Button
            onClick={() => handleSwipe("like")}
            variant="outline"
            size="lg"
            className="rounded-full h-16 w-16 p-0 border-2 border-green-500 text-green-500 hover:bg-green-50 focus:ring-green-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessingSwipe} // Disable button during processing
          >
            <ThumbsUp className="h-7 w-7" />
          </Button>
        </div>
      )}
    </div>
  );
}
