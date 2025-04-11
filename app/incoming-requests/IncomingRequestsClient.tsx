"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Request {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_email: string;
  match_id?: string; // Add match_id to track matches
}

interface IncomingRequestsClientProps {
  initialRequests: Request[];
}

export default function IncomingRequestsClient({
  initialRequests,
}: IncomingRequestsClientProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRequests();

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
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      // Clean up subscription
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user ID
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

      // Fetch all requests (both pending and accepted)
      const { data: requestsData, error: requestsError } = await supabase
        .from("pending_requests")
        .select("id, sender_id, receiver_id, status")
        .eq("receiver_id", userId)
        .or("status.eq.pending,status.eq.accepted");

      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
        throw requestsError;
      }

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get all accepted requests to fetch their match IDs
      const acceptedRequestIds = requestsData
        .filter((req) => req.status === "accepted")
        .map((req) => req.id);

      // Create a map to store match IDs for requests
      const matchIdMap = new Map();

      if (acceptedRequestIds.length > 0) {
        // Fetch matches for the accepted requests
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id, user1_id, user2_id")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        if (!matchesError && matchesData) {
          // For each accepted request, find the corresponding match
          for (const request of requestsData.filter(
            (req) => req.status === "accepted"
          )) {
            const match = matchesData.find(
              (match) =>
                (match.user1_id === userId &&
                  match.user2_id === request.sender_id) ||
                (match.user1_id === request.sender_id &&
                  match.user2_id === userId)
            );

            if (match) {
              matchIdMap.set(request.id, match.id);
            }
          }
        }
      }

      // Fetch the sender emails
      const senderIds = requestsData.map((req) => req.sender_id);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email")
        .in("id", senderIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      // Create a map of user IDs to emails
      const userEmailMap = new Map();
      usersData?.forEach((user) => {
        userEmailMap.set(user.id, user.email);
      });

      // Combine the data
      const combinedData = requestsData.map((request) => ({
        id: request.id,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        status: request.status,
        sender_email: userEmailMap.get(request.sender_id) || "Unknown",
        match_id: matchIdMap.get(request.id), // Add match ID if it exists
      }));

      setRequests(combinedData);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (
    requestId: string,
    senderId: string,
    receiverId: string
  ) => {
    try {
      const supabase = createClient();

      const { error: transactionError } = await supabase.rpc(
        "accept_request_and_create_match",
        {
          p_request_id: requestId,
          p_sender_id: senderId,
          p_receiver_id: receiverId,
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
        .or(`user1_id.eq.${receiverId},user2_id.eq.${receiverId}`)
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

      alert("Request accepted successfully!");
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Failed to accept request. Please try again.");
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
      <h1 className="text-2xl font-bold mb-6 text-white">Incoming Requests</h1>

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
                <p className="font-medium text-[#2A0EFF]">From: {request.sender_email}</p>
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
                <button
                  onClick={() =>
                    handleAccept(
                      request.id,
                      request.sender_id,
                      request.receiver_id
                    )
                  }
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
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
