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

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error("Authentication failed");
      }

      if (!authData.user) {
        throw new Error("User not authenticated");
      }

      const userId = authData.user.id;

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
      <div className="container mx-auto pt-20 px-4 bg-[#2A0EFF] h-screen flex justify-center items-center">
        <RefreshCw className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-20 px-4 bg-[#2A0EFF] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Your Matches</h1>
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
            <Card key={match.id} className="overflow-hidden bg-white shadow-lg shadow-[#2A0EFF]/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
              <CardContent className="p-0">
                <div className="p-4">
                  <h3 className="font-medium text-lg text-[#2A0EFF]">{match.partner_name}</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {match.partner_email}
                  </p>
                  <p className="text-xs text-gray-400">
                    Matched on {new Date(match.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="border-t p-3 bg-gray-50 flex justify-between items-center">
                  <Button
                    className="w-full bg-[#2A0EFF] hover:bg-[#1A0EDF] text-white"
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
