"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Request {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender: {
    id: string;
    name: string;
    bio: string;
    skills: string[];
  };
  match_id?: string;
}

interface IncomingRequestsListProps {
  userId: string;
}

export default function IncomingRequestsList({
  userId,
}: IncomingRequestsListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchIncomingRequests();

    // Set up real-time subscription for updates
    const supabase = createClient();
    const subscription = supabase
      .channel("public:pending_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_requests",
        },
        () => {
          // Refetch requests when changes occur
          fetchIncomingRequests();
        }
      )
      .subscribe();

    return () => {
      // Clean up subscription
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/requests?type=incoming", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch incoming requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching incoming requests:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, senderId: string) => {
    try {
      const supabase = createClient();

      const { error: transactionError } = await supabase.rpc(
        "accept_request_and_create_match",
        {
          p_request_id: requestId,
          p_sender_id: senderId,
          p_receiver_id: userId,
        }
      );

      if (transactionError) {
        console.error("Transaction error:", transactionError);
        throw transactionError;
      }

      // Fetch the created match to get its ID
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .or(`user1_id.eq.${senderId},user2_id.eq.${senderId}`)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (matchError) {
        console.error("Error fetching match:", matchError);
      } else if (matchData && matchData.length > 0) {
        // Update our local state to show the Chat button instead
        setRequests((prevRequests) =>
          prevRequests.map((request) =>
            request.id === requestId
              ? { ...request, status: "accepted", match_id: matchData[0].id }
              : request
          )
        );
      }

      fetchIncomingRequests(); // Refresh the list
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Failed to accept request. Please try again.");
    }
  };

  const navigateToChat = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading incoming requests...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full">
      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No incoming requests at the moment.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border p-4 bg-white rounded-lg shadow-md flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-[#242FFF]">
                  From: {request.sender?.name || "Unknown"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Skills:{" "}
                  {request.sender?.skills?.join(", ") || "Not specified"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Status:{" "}
                  {request.status === "accepted" ? "Accepted" : "Pending"}
                </p>
              </div>

              {request.status === "accepted" && request.match_id ? (
                <button
                  onClick={() => navigateToChat(request.match_id!)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                >
                  Chat
                </button>
              ) : (
                <button
                  onClick={() => handleAccept(request.id, request.sender_id)}
                  className="px-4 py-2 bg-[#242FFF]/10 hover:bg-[#242FFF]/20 text-[#242FFF] rounded-full transition-colors font-medium text-sm"
                >
                  Accept
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
