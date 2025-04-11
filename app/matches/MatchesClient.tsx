"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw } from "lucide-react";

interface MatchData {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
  partner_email?: string;
  partner_name?: string;
}

interface MatchesClientProps {
  initialMatches: MatchData[];
}

export default function MatchesClient({ initialMatches }: MatchesClientProps) {
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Set up real-time subscription for matches table
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
          // Refetch matches when changes occur
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      // Clean up subscription
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get authenticated user
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        console.error("Authentication error:", authError);
        throw new Error("Authentication failed");
      }

      if (!authData.user) {
        throw new Error("User not authenticated");
      }

      const userId = authData.user.id;

      // Fetch all matches where the current user is either user1 or user2
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("status", "active");

      if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        throw matchesError;
      }

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }

      // Get all partner user IDs
      const partnerIds = matchesData.map((match) =>
        match.user1_id === userId ? match.user2_id : match.user1_id
      );

      // Fetch partner user details
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", partnerIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      // Create a map of user IDs to their details
      const userDetailsMap = new Map();
      usersData?.forEach((user) => {
        userDetailsMap.set(user.id, {
          email: user.email,
          name: user.name || user.email.split("@")[0],
        });
      });

      // Combine the data
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

  const navigateToChat = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  if (loading && matches.length === 0) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[200px]">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Matches</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMatches()}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <p className="text-gray-500 mb-2">You don't have any matches yet</p>
          <p className="text-sm text-gray-400">
            Browse skills and connect with others to see your matches here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card key={match.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <h3 className="font-medium text-lg">{match.partner_name}</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {match.partner_email}
                  </p>
                  <p className="text-xs text-gray-400">
                    Matched on {new Date(match.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="border-t p-3 bg-gray-50 flex justify-between items-center">
                  <Button
                    className="w-full"
                    onClick={() => navigateToChat(match.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
