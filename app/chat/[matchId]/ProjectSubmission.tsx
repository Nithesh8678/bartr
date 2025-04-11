"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  Calendar,
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
}

interface ProjectSubmissionProps {
  matchId: string;
}

export default function ProjectSubmission({ matchId }: ProjectSubmissionProps) {
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workContent, setWorkContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchDetails();

    const supabase = createClient();
    const subscription = supabase
      .channel(`match_updates_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          fetchMatchDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("User not authenticated");
      }
      setUserId(userData.user.id);

      // Fetch match details
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError) {
        throw matchError;
      }

      setMatch(matchData);

      // If the work description exists, set it as the default value
      if (matchData.work_description) {
        setWorkContent(matchData.work_description);
      }
    } catch (err) {
      console.error("Error fetching match details:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProject = async () => {
    if (!workContent.trim() || !match || !userId) return;

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      // Call the submit_project function
      const { data, error } = await supabase.rpc("submit_project", {
        p_match_id: matchId,
        p_user_id: userId,
        p_submission_content: workContent,
      });

      if (error) {
        throw error;
      }

      toast.success("Project submitted successfully!");

      // Update local state
      setMatch((prev) => {
        if (!prev) return null;

        if (prev.user1_id === userId) {
          return { ...prev, project_submitted_user1: true };
        } else {
          return { ...prev, project_submitted_user2: true };
        }
      });

      // Refresh match details
      fetchMatchDetails();
    } catch (err) {
      console.error("Error submitting project:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit project"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!match || !userId) return;

    try {
      setIsConfirming(true);
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

      // Refresh match details
      fetchMatchDetails();
    } catch (err) {
      console.error("Error confirming completion:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm completion"
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>Error loading project details: {error || "Match not found"}</p>
      </div>
    );
  }

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

  return (
    <Card className="w-full border-2 border-gray-200 shadow-md mt-4">
      <CardHeader className="bg-slate-50">
        <CardTitle className="text-lg font-semibold flex items-center">
          Project Submission
          {userSubmitted && (
            <CheckCircle className="h-5 w-5 ml-2 text-green-500" />
          )}
        </CardTitle>
        <CardDescription>
          Submit your work to complete the project and receive your staked
          credits back.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {projectDue && (
          <div
            className={`flex items-center mb-4 p-2 rounded ${
              isPastDue ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {isPastDue
                ? `Project was due on ${projectDue.toLocaleDateString()}`
                : `Project due by ${projectDue.toLocaleDateString()}`}
            </span>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <div
            className={`flex-1 p-3 rounded-md ${
              userSubmitted
                ? "bg-green-50 border border-green-200"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <p className="text-sm font-medium mb-1">Your submission</p>
            <div className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full mr-2 ${
                  userSubmitted ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
              <span className="text-xs">
                {userSubmitted ? "Submitted" : "Pending"}
              </span>
            </div>
          </div>

          <div
            className={`flex-1 p-3 rounded-md ${
              partnerSubmitted
                ? "bg-green-50 border border-green-200"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <p className="text-sm font-medium mb-1">Partner's submission</p>
            <div className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full mr-2 ${
                  partnerSubmitted ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
              <span className="text-xs">
                {partnerSubmitted ? "Submitted" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {!userSubmitted ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Describe your work or provide links to your completed project:
            </p>
            <Textarea
              placeholder="Describe your work or paste GitHub links here..."
              className="min-h-[120px] bg-white border border-gray-300"
              value={workContent}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setWorkContent(e.target.value)
              }
              disabled={isSubmitting}
            />
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium mb-2">Your submission:</p>
            <p className="text-sm whitespace-pre-wrap">
              {match.work_description}
            </p>
          </div>
        )}

        {bothSubmitted && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Both of you have completed the project!
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Confirm project completion to receive your {match.stake_amount}{" "}
              credits back.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 justify-end gap-2">
        {!userSubmitted ? (
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmitProject}
            disabled={!workContent.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Submit Project
          </Button>
        ) : bothSubmitted ? (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleConfirmCompletion}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirm Completion
          </Button>
        ) : (
          <p className="text-sm text-gray-500">
            Waiting for your partner to submit their work...
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
