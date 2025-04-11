"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

interface OutgoingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  receiver_email: string;
  match_id?: string;
}

interface PendingRequestsClientProps {
  initialRequests: OutgoingRequest[];
}

export default function PendingRequestsClient({
  initialRequests,
}: PendingRequestsClientProps) {
  const [requests, setRequests] = useState<OutgoingRequest[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRequests();

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
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
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

      const { data: requestsData, error: requestsError } = await supabase
        .from("pending_requests")
        .select("id, sender_id, receiver_id, status")
        .eq("sender_id", userId)
        .or("status.eq.pending,status.eq.accepted");

      if (requestsError) {
        throw requestsError;
      }

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      const acceptedRequestIds = requestsData
        .filter((req) => req.status === "accepted")
        .map((req) => req.id);

      const matchIdMap = new Map();

      if (acceptedRequestIds.length > 0) {
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id, user1_id, user2_id")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        if (!matchesError && matchesData) {
          for (const request of requestsData.filter(
            (req) => req.status === "accepted"
          )) {
            const match = matchesData.find(
              (match) =>
                (match.user1_id === userId &&
                  match.user2_id === request.receiver_id) ||
                (match.user1_id === request.receiver_id &&
                  match.user2_id === userId)
            );

            if (match) {
              matchIdMap.set(request.id, match.id);
            }
          }
        }
      }

      const receiverIds = requestsData.map((req) => req.receiver_id);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email")
        .in("id", receiverIds);

      if (usersError) {
        throw usersError;
      }

      const userEmailMap = new Map();
      usersData?.forEach((user) => {
        userEmailMap.set(user.id, user.email);
      });

      const combinedData = requestsData.map((request) => ({
        id: request.id,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        status: request.status,
        receiver_email: userEmailMap.get(request.receiver_id) || "Unknown",
        match_id: matchIdMap.get(request.id),
      }));

      setRequests(combinedData);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateToChat = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto pt-20 px-4 bg-[#2A0EFF] h-screen">
      <h1 className="text-2xl font-bold mb-6 text-white">Pending Requests</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests at the moment.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border p-4 bg-white rounded-md shadow-lg shadow-[#2A0EFF]/10 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-[#2A0EFF]">To: {request.receiver_email}</p>
                <p className="text-sm text-gray-500">
                  Status:{" "}
                  {request.status === "accepted" ? "Accepted" : "Pending"}
                </p>
              </div>

              {request.status === "accepted" && request.match_id ? (
                <button
                  onClick={() => navigateToChat(request.match_id!)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Chat
                </button>
              ) : (
                <span className="px-4 py-2 rounded bg-yellow-100 text-yellow-800">
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
