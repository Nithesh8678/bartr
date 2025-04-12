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
  Sparkles,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import Link from "next/link";
import { GridSmallBackgroundDemo } from "@/components/GridSmallBackgroundDemo";

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

        // Debug the structure of the first item if available
        if (data.length > 0) {
          console.log("First match structure:", {
            hasSkillsOffered: "skills_offered" in data[0],
            skillsOfferedType: typeof data[0].skills_offered,
            isArray: Array.isArray(data[0].skills_offered),
            skillsOffered: data[0].skills_offered,
            keys: Object.keys(data[0]),
          });
        }

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
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: (direction: "left" | "right" | null) => ({
      x: direction === "left" ? -300 : direction === "right" ? 300 : 0,
      opacity: 0,
      scale: 0.7,
      rotate: direction === "left" ? -10 : direction === "right" ? 10 : 0,
      transition: { duration: 0.3 },
    }),
  };

  const renderSkills = (
    skills: any[], // Changed to any[] to handle different formats
    label: string,
    bgColor: string,
    textColor: string
  ) => {
    // Add a direct debug view if skills array exists but is empty
    console.log(`Skills for ${label}:`, skills);
    console.log(`Skills type:`, typeof skills);
    console.log(`Is Array:`, Array.isArray(skills));

    if (!skills || skills.length === 0) {
      return (
        <div className="mb-3">
          <h4 className="text-sm font-semibold mb-1 text-red-600">
            {label}: No skills found
          </h4>
          <p className="text-xs text-gray-500">
            Debug: {JSON.stringify(skills)}
          </p>
        </div>
      );
    }

    return (
      <div className="mb-3">
        <h4 className="text-sm font-semibold mb-1 text-gray-600">
          {label}: ({skills.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {Array.isArray(skills) ? (
            skills.map((skill, idx) => {
              // Handle both string skills and object skills
              const skillText =
                typeof skill === "string"
                  ? skill
                  : skill && typeof skill === "object" && "name" in skill
                  ? skill.name
                  : JSON.stringify(skill);

              return (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} border border-opacity-20 shadow-sm`}
                >
                  {skillText}
                </motion.span>
              );
            })
          ) : (
            <span className="text-red-500 text-xs">
              Skills not in array format
            </span>
          )}
        </div>
      </div>
    );
  };

  const currentProfile = users[currentIndex];

  const floatingElements = {
    variants: {
      initial: { y: 0, opacity: 0.7 },
      animate: (i: number) => ({
        y: [0, i % 2 === 0 ? -15 : -10, 0],
        opacity: [0.7, 1, 0.7],
        transition: {
          repeat: Infinity,
          repeatType: "mirror" as const,
          duration: 6 + i * 0.5,
          ease: "easeInOut",
        },
      }),
    },
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Use GridSmallBackgroundDemo for background */}
      <GridSmallBackgroundDemo />

      <div className="relative z-10 w-full max-w-md px-4 pt-12">
        {/* <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center mb-8"
        >
          <div className="relative h-1 w-24 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full">
            <motion.div
              className="absolute -top-1.5 left-0 h-4 w-4 rounded-full bg-indigo-500"
              animate={{
                x: [0, 96, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div> */}

        <Toaster position="top-center" richColors />
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-gray-500 my-20"
          >
            <Loader2 className="h-12 w-12 animate-spin mb-4 text-white" />
            <p className="font-medium text-white">
              Finding AI-powered matches...
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-red-600 bg-red-50 p-6 rounded-xl shadow-sm border border-red-100"
          >
            <p>Error loading users: {error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="mt-4 bg-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </motion.div>
        )}

        {!isLoading && !error && (
          <div className="relative w-full h-[70vh] flex items-center justify-center">
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="w-full h-full flex flex-col overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-indigo-100">
                    <CardHeader className="p-5 border-b border-indigo-50 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            {currentProfile.name || "Unnamed User"}
                          </CardTitle>
                        </div>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200 shadow-sm"
                        >
                          <BrainCircuit className="h-3 w-3 mr-1" /> AI Score:{" "}
                          <span className="ml-1 font-bold">
                            {currentProfile.relevance_score}/10
                          </span>
                        </motion.span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                      {currentProfile.bio && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <h1 className="text-sm font-semibold mb-2 text-indigo-700">
                            About
                          </h1>
                          <p className="text-sm text-gray-700 mb-5 leading-relaxed border-l-2 border-indigo-100 pl-3 italic">
                            {currentProfile.bio}
                          </p>
                        </motion.div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        {renderSkills(
                          currentProfile.skills_offered || [],
                          "Skills Offered",
                          "bg-gradient-to-r from-blue-50 to-indigo-100",
                          "text-indigo-800"
                        )}
                      </motion.div>
                    </CardContent>
                    <CardFooter className="p-4 border-t border-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50">
                      <p className="text-xs text-indigo-400 italic">
                        Swipe or use buttons below
                      </p>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-md"
                >
                  <p className="text-lg font-medium text-indigo-800">
                    No more profiles to show!
                  </p>
                  <p className="text-sm mt-1 text-gray-600">
                    Check back later or adjust your needed skills.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 text-indigo-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Reload
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && !error && currentIndex >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-8 mt-6"
          >
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                onClick={() => handleSwipe("skip")}
                variant="outline"
                size="lg"
                className="rounded-full h-16 w-16 p-0 border-2 border-red-400 text-red-500 bg-white hover:bg-red-50 focus:ring-4 focus:ring-red-100 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                disabled={isProcessingSwipe}
              >
                <ThumbsDown className="h-7 w-7" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                onClick={() => handleSwipe("like")}
                variant="outline"
                size="lg"
                className="rounded-full h-16 w-16 p-0 border-2 border-green-400 text-green-500 bg-white hover:bg-green-50 focus:ring-4 focus:ring-green-100 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                disabled={isProcessingSwipe}
              >
                <ThumbsUp className="h-7 w-7" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
