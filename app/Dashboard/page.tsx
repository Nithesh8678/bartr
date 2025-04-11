"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  MessageCircle,
  ArrowUpCircle,
  Clock,
  Award,
  User,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface MatchDetails {
  id: string;
  user1_id: string;
  user2_id: string;
  stake_status_user1: boolean;
  stake_status_user2: boolean;
  project_submitted_user1: boolean;
  project_submitted_user2: boolean;
  project_end_date: string | null;
  work_description: string | null;
  stake_amount: number;
  partner_name?: string;
  partner_email?: string;
}

export default function Dashboard() {
  const [matches, setMatches] = useState<MatchDetails[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workContents, setWorkContents] = useState<Record<string, string>>({});
  const [submittingMatch, setSubmittingMatch] = useState<string | null>(null);
  const [confirmingMatch, setConfirmingMatch] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
    fetchMatches();

    const supabase = createClient();
    const subscription = supabase
      .channel("public:matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("User not authenticated");
      }

      setUserId(authData.user.id);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("User not authenticated");
      }

      const userId = authData.user.id;
      setUserId(userId);

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("status", "active");

      if (matchesError) {
        throw matchesError;
      }

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setIsLoading(false);
        return;
      }

      const partnerIds = matchesData.map((match) =>
        match.user1_id === userId ? match.user2_id : match.user1_id
      );

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", partnerIds);

      if (usersError) {
        throw usersError;
      }

      const userDetailsMap = new Map();
      usersData?.forEach((user) => {
        userDetailsMap.set(user.id, {
          email: user.email,
          name: user.name || user.email.split("@")[0],
        });
      });

      const combinedMatches = matchesData.map((match) => {
        const partnerId =
          match.user1_id === userId ? match.user2_id : match.user1_id;
        const partnerDetails = userDetailsMap.get(partnerId);

        // Initialize work content in state
        if (match.work_description && !workContents[match.id]) {
          setWorkContents((prev) => ({
            ...prev,
            [match.id]: match.work_description || "",
          }));
        }

        return {
          id: match.id,
          user1_id: match.user1_id,
          user2_id: match.user2_id,
          status: match.status,
          created_at: match.created_at,
          stake_status_user1: match.stake_status_user1 || false,
          stake_status_user2: match.stake_status_user2 || false,
          is_chat_enabled: match.is_chat_enabled || false,
          project_submitted_user1: match.project_submitted_user1 || false,
          project_submitted_user2: match.project_submitted_user2 || false,
          stake_amount: match.stake_amount || 10,
          project_end_date: match.project_end_date,
          work_description: match.work_description,
          partner_email: partnerDetails?.email || "Unknown",
          partner_name: partnerDetails?.name || "Unknown",
        };
      });

      setMatches(combinedMatches);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkContentChange = (matchId: string, content: string) => {
    setWorkContents((prev) => ({
      ...prev,
      [matchId]: content,
    }));
  };

  const handleSubmitProject = async (matchId: string) => {
    if (!workContents[matchId]?.trim() || !userId) return;

    try {
      setSubmittingMatch(matchId);
      const supabase = createClient();

      // Call the submit_project function
      const { data, error } = await supabase.rpc("submit_project", {
        p_match_id: matchId,
        p_user_id: userId,
        p_submission_content: workContents[matchId],
      });

      if (error) {
        throw error;
      }

      toast.success("Project submitted successfully!");
      fetchMatches();
    } catch (err) {
      console.error("Error submitting project:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit project"
      );
    } finally {
      setSubmittingMatch(null);
    }
  };

  const handleConfirmCompletion = async (matchId: string) => {
    if (!userId) return;

    try {
      setConfirmingMatch(matchId);
      const supabase = createClient();

      // Call the confirm_completion function
      const { data, error } = await supabase.rpc("confirm_completion", {
        p_match_id: matchId,
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      toast.success(
        "Project completion confirmed! Credits have been refunded."
      );
      fetchMatches();
    } catch (err) {
      console.error("Error confirming completion:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm completion"
      );
    } finally {
      setConfirmingMatch(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen p-6">
        <Loader2 className="h-6 w-6 animate-spin text-[#2A0EFF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Error</h2>
        </div>
        <p className="mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 pt-20 bg-[#2A0EFF]">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Project Dashboard
        </h1>
        <p className="text-white">
          Submit your work and track project completion status
        </p>
      </div>

      {matches.length === 0 ? (
        <Card className="max-w-2xl mx-auto border-none shadow-md bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-[#2A0EFF]/10 rounded-full flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-[#2A0EFF]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No active projects
            </h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              You don't have any active collaboration projects. Find a partner
              to start working together.
            </p>
            <Button
              onClick={() => router.push("/skillsearch")}
              className="bg-[#2A0EFF] hover:bg-[#2A0EFF]/90"
            >
              Find a Match
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8">
            {matches.map((match) => {
              const isUser1 = userId === match.user1_id;
              const userSubmitted = isUser1
                ? match.project_submitted_user1
                : match.project_submitted_user2;
              const partnerSubmitted = isUser1
                ? match.project_submitted_user2
                : match.project_submitted_user1;
              const bothSubmitted =
                match.project_submitted_user1 && match.project_submitted_user2;
              const projectDue = match.project_end_date
                ? new Date(match.project_end_date)
                : null;
              const isPastDue = projectDue ? new Date() > projectDue : false;
              const daysLeft = projectDue
                ? Math.max(
                    0,
                    Math.ceil(
                      (projectDue.getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : null;

              return (
                <Card
                  key={match.id}
                  className={`w-full border shadow-lg overflow-hidden bg-white`}
                >
                  <div className="relative">
                    {bothSubmitted && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                        Completed
                      </div>
                    )}
                    {userSubmitted && !bothSubmitted && (
                      <div className="absolute top-0 right-0 bg-[#2A0EFF] text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                        Awaiting Partner
                      </div>
                    )}
                    {!userSubmitted && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                        Submission Required
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          Collaboration with {match.partner_name}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center">
                          <Award className="h-4 w-4 mr-1 text-amber-500" />
                          <span>{match.stake_amount} credits staked</span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/chat/${match.id}`)}
                        className="flex items-center border-[#2A0EFF]/20 text-[#2A0EFF] hover:bg-[#2A0EFF]/10"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" /> Message
                        Partner
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 px-6">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Left column - Status info */}
                      <div className="md:w-1/3 space-y-6">
                        {/* Timeline status */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            Project Timeline
                          </h3>

                          {projectDue && (
                            <div
                              className={`flex items-center p-3 rounded-lg ${
                                isPastDue
                                  ? "bg-red-100 text-red-700"
                                  : daysLeft && daysLeft < 3
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-[#2A0EFF]/10 text-[#2A0EFF]"
                              }`}
                            >
                              <Clock className="h-5 w-5 mr-3 flex-shrink-0" />
                              <div>
                                <p className="font-medium">
                                  {isPastDue
                                    ? "Project deadline passed"
                                    : daysLeft === 0
                                    ? "Due today"
                                    : `${daysLeft} ${
                                        daysLeft === 1 ? "day" : "days"
                                      } remaining`}
                                </p>
                                <p className="text-xs mt-0.5">
                                  {projectDue.toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Participant status */}
                          <div className="bg-white rounded-lg border shadow-sm p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              Project Participants
                            </h4>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#2A0EFF]/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-[#2A0EFF]" />
                                  </div>
                                  <span className="text-sm">You</span>
                                </div>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    userSubmitted
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {userSubmitted ? "Submitted" : "Pending"}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#2A0EFF]/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-[#2A0EFF]" />
                                  </div>
                                  <span className="text-sm">
                                    {match.partner_name}
                                  </span>
                                </div>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    partnerSubmitted
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {partnerSubmitted ? "Submitted" : "Pending"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Confirmation Section (only shown if partner has submitted) */}
                        {partnerSubmitted &&
                          !bothSubmitted &&
                          !userSubmitted && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Partner submitted
                              </h3>
                              <p className="text-sm text-amber-700 mb-4">
                                Your partner has already submitted their work.
                                Please submit your work as well.
                              </p>
                            </div>
                          )}

                        {partnerSubmitted &&
                          !bothSubmitted &&
                          userSubmitted && (
                            <div className="bg-[#2A0EFF]/5 border border-[#2A0EFF]/20 rounded-lg p-4">
                              <h3 className="font-medium text-[#2A0EFF] mb-2 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Partner's submission ready for review
                              </h3>
                              <p className="text-sm text-[#2A0EFF]/80 mb-4">
                                Confirm their work meets your requirements to
                                return their staked credits.
                              </p>
                              <Button
                                onClick={() =>
                                  handleConfirmCompletion(match.id)
                                }
                                disabled={confirmingMatch === match.id}
                                className="w-full bg-[#2A0EFF] hover:bg-[#2A0EFF]/90"
                              >
                                {confirmingMatch === match.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Confirming...
                                  </>
                                ) : (
                                  "Confirm Completion"
                                )}
                              </Button>
                            </div>
                          )}

                        {/* Both Submitted Message */}
                        {bothSubmitted && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h3 className="font-medium text-green-800 mb-2 flex items-center">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Project Successfully Completed
                            </h3>
                            <p className="text-sm text-green-700">
                              Both parties have completed this project. Your
                              staked credits have been refunded to your account.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right column - Submission form */}
                      <div className="md:w-2/3 bg-white rounded-lg border shadow-sm p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          {userSubmitted ? (
                            <>
                              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                              Your Submission
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="h-5 w-5 mr-2 text-[#2A0EFF]" />
                              Submit Your Work
                            </>
                          )}
                        </h3>

                        {!userSubmitted ? (
                          <>
                            <p className="text-gray-600 mb-4 text-sm">
                              Describe your work, provide links to your files,
                              or include any other information needed to
                              showcase your completed project.
                            </p>

                            <Textarea
                              placeholder="Describe your work or provide links to your project files..."
                              value={workContents[match.id] || ""}
                              onChange={(e) =>
                                handleWorkContentChange(
                                  match.id,
                                  e.target.value
                                )
                              }
                              className="min-h-40 border-gray-300 focus:border-[#2A0EFF] focus:ring-[#2A0EFF] mb-4"
                              disabled={userSubmitted}
                            />

                            <Button
                              onClick={() => handleSubmitProject(match.id)}
                              disabled={
                                !workContents[match.id]?.trim() ||
                                submittingMatch === match.id
                              }
                              className="w-full bg-[#2A0EFF] hover:bg-[#2A0EFF]/90"
                            >
                              {submittingMatch === match.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle className="h-5 w-5 mr-2" />
                                  Submit Work
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 overflow-auto max-h-60">
                              <p className="whitespace-pre-wrap text-gray-700">
                                {workContents[match.id] ||
                                  match.work_description ||
                                  ""}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                Submitted on {new Date().toLocaleDateString()}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
