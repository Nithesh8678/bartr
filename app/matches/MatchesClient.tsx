"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  RefreshCw,
  Coins,
  Check,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface MatchData {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
  stake_status_user1: boolean;
  stake_status_user2: boolean;
  is_chat_enabled: boolean;
  project_submitted_user1: boolean;
  project_submitted_user2: boolean;
  stake_amount: number;
  project_end_date: string | null;
  work_description: string | null;
  partner_email?: string;
  partner_name?: string;
}

interface MatchesClientProps {
  initialMatches: MatchData[];
}

export default function MatchesClient({ initialMatches }: MatchesClientProps) {
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [stakingId, setStakingId] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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

      if (authError) {
        throw new Error("Authentication failed");
      }

      if (!authData.user) {
        throw new Error("User not authenticated");
      }

      setUserId(authData.user.id);

      // Fetch user credits
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("credits")
        .eq("id", authData.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      setUserCredits(userData?.credits || 0);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error("Authentication failed");
      }

      if (!authData.user) {
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
      setLoading(false);
    }
  };

  const stakeCredits = async (matchId: string) => {
    try {
      setStakingId(matchId);
      const supabase = createClient();

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Check if user has enough credits
      if (userCredits < 10) {
        toast.error("You don't have enough credits to stake");
        return;
      }

      const matchToStake = matches.find((m) => m.id === matchId);
      if (!matchToStake) {
        throw new Error("Match not found");
      }

      // Determine which user is staking
      const isUser1 = matchToStake.user1_id === userId;
      const stakeField = isUser1 ? "stake_status_user1" : "stake_status_user2";

      // Begin transaction with normal database operations instead of RPC
      // 1. Update the match stake status
      const { error: matchUpdateError } = await supabase
        .from("matches")
        .update({ [stakeField]: true })
        .eq("id", matchId);

      if (matchUpdateError) {
        throw matchUpdateError;
      }

      // 2. Check if both users have staked to enable chat
      const partnerStaked = isUser1
        ? matchToStake.stake_status_user2
        : matchToStake.stake_status_user1;

      if (partnerStaked) {
        // Enable chat if both users have staked
        const { error: chatUpdateError } = await supabase
          .from("matches")
          .update({ is_chat_enabled: true })
          .eq("id", matchId);

        if (chatUpdateError) {
          throw chatUpdateError;
        }
      }

      // 3. Deduct credits from user
      const { error: creditsUpdateError } = await supabase
        .from("users")
        .update({ credits: userCredits - 10 })
        .eq("id", userId);

      if (creditsUpdateError) {
        throw creditsUpdateError;
      }

      // Update local state
      setUserCredits((prev) => prev - 10);

      // Update match in local state
      setMatches((prev) =>
        prev.map((match) => {
          if (match.id === matchId) {
            return {
              ...match,
              [stakeField]: true,
              is_chat_enabled:
                (isUser1 ? true : match.stake_status_user1) &&
                (!isUser1 ? true : match.stake_status_user2),
            };
          }
          return match;
        })
      );

      toast.success("Credits staked successfully!");

      // Refresh matches after staking
      fetchMatches();
    } catch (err) {
      console.error("Error staking credits:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to stake credits"
      );
    } finally {
      setStakingId(null);
    }
  };

  const navigateToChat = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  const getUserStakeStatus = (match: MatchData) => {
    if (!userId) return false;
    return match.user1_id === userId
      ? match.stake_status_user1
      : match.stake_status_user2;
  };

  const getPartnerStakeStatus = (match: MatchData) => {
    if (!userId) return false;
    return match.user1_id === userId
      ? match.stake_status_user2
      : match.stake_status_user1;
  };

  if (loading && matches.length === 0) {
    return (
      <div className="container mx-auto pt-20 px-4 bg-[#2A0EFF] h-screen flex justify-center items-center">
        <RefreshCw className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-20 px-4 bg-[#2A0EFF] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Your Matches</h1>
        <div className="flex items-center space-x-4">
          <div className="bg-white/10 px-3 py-1 rounded-md text-white">
            <span className="flex items-center">
              <Coins className="h-4 w-4 mr-1" /> {userCredits} Credits
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMatches()}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border shadow-lg shadow-[#2A0EFF]/10">
          <p className="text-gray-500 mb-2">You don't have any matches yet</p>
          <p className="text-sm text-gray-400">
            Browse skills and connect with others to see your matches here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card
              key={match.id}
              className="overflow-hidden bg-white shadow-lg shadow-[#2A0EFF]/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
            >
              <CardContent className="p-0">
                <div className="p-4">
                  <h3 className="font-medium text-lg text-[#2A0EFF]">
                    {match.partner_name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">
                    {match.partner_email}
                  </p>

                  {/* Stake Status Indicators */}
                  <div className="flex items-center justify-between my-2 p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center text-xs text-gray-500">
                      <div
                        className={`h-2 w-2 rounded-full mr-1 ${
                          getUserStakeStatus(match)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      Your stake:{" "}
                      {getUserStakeStatus(match) ? "Complete" : "Pending"}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <div
                        className={`h-2 w-2 rounded-full mr-1 ${
                          getPartnerStakeStatus(match)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      Partner stake:{" "}
                      {getPartnerStakeStatus(match) ? "Complete" : "Pending"}
                    </div>
                  </div>

                  {match.project_end_date && (
                    <div className="flex items-center text-xs text-gray-400 mt-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due:{" "}
                      {new Date(match.project_end_date).toLocaleDateString()}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    Matched on {new Date(match.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="border-t p-3 bg-gray-50 flex justify-between items-center">
                  {!getUserStakeStatus(match) ? (
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={() => stakeCredits(match.id)}
                      disabled={stakingId === match.id || userCredits < 10}
                    >
                      {stakingId === match.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Coins className="h-4 w-4 mr-2" />
                      )}
                      Stake 10 Credits
                    </Button>
                  ) : !match.is_chat_enabled ? (
                    <Button
                      className="w-full bg-gray-300 text-gray-600 cursor-not-allowed"
                      disabled
                    >
                      <span className="flex items-center">
                        Waiting for partner{" "}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </span>
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-[#2A0EFF] hover:bg-[#1A0EDF] text-white"
                      onClick={() => navigateToChat(match.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
