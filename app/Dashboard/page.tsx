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
import { awardBarterCompletionCredits } from "@/lib/services/wallet";

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
  const [partnerWorkContents, setPartnerWorkContents] = useState<
    Record<string, string>
  >({});
  const [submittingMatch, setSubmittingMatch] = useState<string | null>(null);
  const [confirmingMatch, setConfirmingMatch] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
    fetchMatches();

    // <div className=""></div>

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

    // Add subscription for messages table to catch partner submissions
    const messagesSubscription = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(messagesSubscription);
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

      // Get ALL messages for the matches, including both users' submissions
      const matchIds = matchesData.map((match) => match.id);
      let { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .in("match_id", matchIds)
        .eq("message_type", "submission")
        .order("timestamp", { ascending: false });

      // If we didn't get any "submission" type messages, try without the filter
      // in case the message_type column doesn't exist yet
      if (!messagesData || messagesData.length === 0) {
        const { data: allMessages, error: allMessagesError } = await supabase
          .from("messages")
          .select("*")
          .in("match_id", matchIds)
          .order("timestamp", { ascending: false });

        if (!allMessagesError && allMessages) {
          console.log("Fetched all messages:", allMessages);
          // Use these instead
          messagesData = allMessages;
        }
      }

      console.log("All messages found:", messagesData);

      // Process each match
      for (const match of matchesData) {
        const isUser1 = userId === match.user1_id;
        const partnerId = isUser1 ? match.user2_id : match.user1_id;

        // Find messages for this specific match
        const matchMessages =
          messagesData?.filter((msg) => msg.match_id === match.id) || [];

        console.log(`Match ${match.id} messages:`, matchMessages);

        // Handle USER's OWN submission first
        if (isUser1) {
          // User1 - get from work_description
          if (match.project_submitted_user1) {
            setWorkContents((prev) => ({
              ...prev,
              [match.id]: match.work_description || "",
            }));
          } else {
            setWorkContents((prev) => ({
              ...prev,
              [match.id]: "",
            }));
          }
        } else {
          // User2 - get from messages
          const userMessages = matchMessages.filter(
            (msg) => msg.sender_id === userId
          );

          if (userMessages.length > 0 && match.project_submitted_user2) {
            setWorkContents((prev) => ({
              ...prev,
              [match.id]: userMessages[0].message || "",
            }));
          } else {
            setWorkContents((prev) => ({
              ...prev,
              [match.id]: "",
            }));
          }
        }

        // Handle PARTNER'S submission
        if (isUser1) {
          // Partner is User2, get submission from messages
          const partnerMessages = matchMessages.filter(
            (msg) => msg.sender_id === partnerId
          );

          console.log("Partner (User2) messages:", partnerMessages);

          if (partnerMessages.length > 0 && match.project_submitted_user2) {
            setPartnerWorkContents((prev) => ({
              ...prev,
              [match.id]: partnerMessages[0].message || "",
            }));
          } else {
            setPartnerWorkContents((prev) => ({
              ...prev,
              [match.id]: match.project_submitted_user2
                ? "Partner has submitted their work but content is unavailable."
                : "Partner hasn't submitted work yet.",
            }));
          }
        } else {
          // Partner is User1, get submission from work_description
          if (match.project_submitted_user1) {
            setPartnerWorkContents((prev) => ({
              ...prev,
              [match.id]:
                match.work_description || "Partner has submitted their work.",
            }));
          } else {
            setPartnerWorkContents((prev) => ({
              ...prev,
              [match.id]: "Partner hasn't submitted work yet.",
            }));
          }
        }
      }

      const combinedMatches = matchesData.map((match) => {
        const partnerId =
          match.user1_id === userId ? match.user2_id : match.user1_id;
        const partnerDetails = userDetailsMap.get(partnerId);

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

      // Filter matches to show only those where both users have staked
      const stakedMatches = combinedMatches.filter(
        (match) => match.stake_status_user1 && match.stake_status_user2
      );

      // If there are matches but none with both users having staked, redirect to matches page
      if (stakedMatches.length === 0 && combinedMatches.length > 0) {
        router.push("/matches");
        toast.info("Both users need to stake credits to access the dashboard");
        return;
      }

      setMatches(stakedMatches);
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

  // Reset the work content for user2 if they haven't submitted yet
  useEffect(() => {
    if (!isLoading && userId && matches.length > 0) {
      matches.forEach((match) => {
        const isUser1 = userId === match.user1_id;
        const userSubmitted = isUser1
          ? match.project_submitted_user1
          : match.project_submitted_user2;

        if (!userSubmitted && !isUser1) {
          // User2 who hasn't submitted should see empty text box
          setWorkContents((prev) => ({
            ...prev,
            [match.id]: "",
          }));
        }
      });
    }
  }, [isLoading, userId, matches]);

  const handleSubmitProject = async (matchId: string) => {
    if (!workContents[matchId]?.trim() || !userId) return;

    try {
      setSubmittingMatch(matchId);
      const supabase = createClient();
      const content = workContents[matchId];

      // Get match information
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError) {
        throw matchError;
      }

      const isUser1 = userId === matchData.user1_id;

      // Store user1's submission in work_description field
      if (isUser1) {
        const { error: updateError } = await supabase
          .from("matches")
          .update({
            work_description: content,
            project_submitted_user1: true,
          })
          .eq("id", matchId);

        if (updateError) {
          throw updateError;
        }
      } else {
        // For user2, just update submission status
        const { error: updateError } = await supabase
          .from("matches")
          .update({
            project_submitted_user2: true,
          })
          .eq("id", matchId);

        if (updateError) {
          throw updateError;
        }

        // Store user2's submission in a separate table or in messages
        const { error: storeError } = await supabase.from("messages").insert({
          match_id: matchId,
          sender_id: userId,
          message: content,
          timestamp: new Date().toISOString(),
          message_type: "submission",
        });

        if (storeError) {
          console.error("Failed to store user2 submission:", storeError);
        }
      }

      // Call the submit_project function
      const { data, error } = await supabase.rpc("submit_project", {
        p_match_id: matchId,
        p_user_id: userId,
        p_submission_content: content,
      });

      const { data: matchStake, error: matchStakeError } = await supabase
        .from("matches")
        .select("stake_amount")
        .eq("id", matchId)
        .single();

      if (matchStakeError) {
        throw matchStakeError;
      }

      const { data: userCredits, error: userCreditsError } = await supabase
        .from("users")
        .select("credits")
        .eq("id", userId)
        .single();

      if (userCreditsError) {
        throw userCreditsError;
      }

      const userNewCredits =
        userCredits.credits + (matchStake?.stake_amount - 1);

      const { error: updateCreditsError } = await supabase
        .from("users")
        .update({ credits: userNewCredits })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      // Update local state with the submitted content
      setWorkContents((prev) => ({
        ...prev,
        [matchId]: content,
      }));

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
    alert("hi");
    if (!userId) return;

    try {
      setConfirmingMatch(matchId);
      const supabase = createClient();

      // Get the match details to determine user IDs
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(
          "user1_id, user2_id, stake_amount, stake_status_user1, stake_status_user2, project_submitted_user1, project_submitted_user2"
        )
        .eq("id", matchId)
        .single();

      if (matchError) {
        throw matchError;
      }

      // Check if both users have submitted their projects
      if (
        !matchData.project_submitted_user1 ||
        !matchData.project_submitted_user2
      ) {
        throw new Error(
          "Both users must submit their projects before confirming completion"
        );
      }

      // Get current credits for both users
      const { data: user1Data, error: user1Error } = await supabase
        .from("users")
        .select("credits")
        .eq("id", matchData.user1_id)
        .single();

      if (user1Error) {
        throw user1Error;
      }

      const { data: user2Data, error: user2Error } = await supabase
        .from("users")
        .select("credits")
        .eq("id", matchData.user2_id)
        .single();

      if (user2Error) {
        throw user2Error;
      }

      // Refund staked credits to user 1
      const user1NewCredits = (user1Data.credits || 0) + matchData.stake_amount;
      const { error: refund1Error } = await supabase
        .from("users")
        .update({ credits: user1NewCredits })
        .eq("id", matchData.user1_id);

      if (refund1Error) {
        throw refund1Error;
      }

      // Refund staked credits to user 2
      const user2NewCredits = (user2Data.credits || 0) + matchData.stake_amount;
      const { error: refund2Error } = await supabase
        .from("users")
        .update({ credits: user2NewCredits })
        .eq("id", matchData.user2_id);

      if (refund2Error) {
        throw refund2Error;
      }

      // Log the refund transactions
      const { error: log1Error } = await supabase
        .from("users")
        .update({
          credits: user1NewCredits,
        })
        .eq("id", matchData.user1_id);

      const { error: log2Error } = await supabase
        .from("users")
        .update({
          credits: user2NewCredits,
        })
        .eq("id", matchData.user2_id);

      if (log1Error || log2Error) {
        throw log1Error || log2Error;
      }

      // Mark match as completed
      const { error: statusError } = await supabase
        .from("matches")
        .update({ status: "completed" })
        .eq("id", matchId);

      if (statusError) {
        throw statusError;
      }

      // Award 10 extra credits to both users as reward
      const { success, error } = await awardBarterCompletionCredits(
        matchData.user1_id,
        matchData.user2_id,
        8
      );

      if (!success) {
        throw error;
      }

      toast.success(
        "Project completion confirmed! Credits have been refunded and you received 10 extra credits as a reward."
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

                            <div className="flex items-center mb-2">
                              <div className="w-7 h-7 rounded-full bg-[#2A0EFF]/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-[#2A0EFF]" />
                              </div>
                              <span className="ml-2 text-sm font-medium text-gray-700">
                                You
                              </span>
                            </div>

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
                              <div className="flex items-center mb-2">
                                <div className="w-7 h-7 rounded-full bg-[#2A0EFF]/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-[#2A0EFF]" />
                                </div>
                                <span className="ml-2 text-sm font-medium text-gray-700">
                                  You
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-gray-700">
                                {workContents[match.id] || ""}
                              </p>
                              {workContents[match.id] &&
                                workContents[match.id].includes(
                                  "tracked separately"
                                ) && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    Note: Your submission was recorded
                                    successfully but can't be displayed here due
                                    to how data is stored.
                                  </div>
                                )}
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                Submitted on {new Date().toLocaleDateString()}
                              </p>
                            </div>

                            {partnerSubmitted && (
                              <div className="mt-6">
                                <h4 className="text-md font-semibold text-gray-700 mb-3">
                                  Partner's Submission
                                </h4>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2 overflow-auto max-h-60">
                                  <div className="flex items-center mb-2">
                                    <div className="w-7 h-7 rounded-full bg-[#2A0EFF]/10 flex items-center justify-center">
                                      <User className="h-4 w-4 text-[#2A0EFF]" />
                                    </div>
                                    <span className="ml-2 text-sm font-medium text-gray-700">
                                      {match.partner_name}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-gray-700">
                                    {partnerWorkContents[match.id] ||
                                      "No submission content available"}
                                  </p>

                                  {partnerWorkContents[match.id] &&
                                    (partnerWorkContents[match.id].includes(
                                      "unavailable"
                                    ) ||
                                      partnerWorkContents[match.id].includes(
                                        "hasn't"
                                      )) && (
                                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                        <p className="text-sm text-blue-700">
                                          <strong>Note:</strong> Both you and
                                          your partner can see each other's
                                          submissions, ensuring transparency in
                                          the collaboration process.
                                        </p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
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
