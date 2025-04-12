"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Request {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  receiver: {
    id: string;
    name: string;
    bio: string;
    skills: string[];
  };
  match_id?: string;
}

interface PendingRequestsListProps {
  userId: string;
}

export default function PendingRequestsList({
  userId,
}: PendingRequestsListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPendingRequests();

    // Set up real-time subscription for updates
    const supabase = createClient();
    const subscription = supabase
      .channel("pending_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_requests",
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/requests?type=pending", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching pending requests:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateToChat = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending requests...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full">
      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending requests at the moment.
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
                  To: {request.receiver?.name || "Unknown"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Skills:{" "}
                  {request.receiver?.skills?.join(", ") || "Not specified"}
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
                <span className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                  Waiting for response
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
