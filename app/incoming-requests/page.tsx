"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";

interface Request {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_email: string;
}

export default function IncomingRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
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
      console.log("Fetching requests for user:", userId);

      // First, fetch the pending requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("pending_requests")
        .select("id, sender_id, receiver_id, status")
        .eq("receiver_id", userId)
        .eq("status", "pending");

      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
        throw requestsError;
      }

      console.log("Pending requests:", requestsData);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Then, fetch the sender emails
      const senderIds = requestsData.map((req) => req.sender_id);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email")
        .in("id", senderIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      console.log("Users data:", usersData);

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
      }));

      console.log("Combined data:", combinedData);
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

      // Start a transaction by using a single RPC call
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

      // Refresh the list
      fetchRequests();

      alert("Request accepted successfully!");
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Failed to accept request. Please try again.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Incoming Requests</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests at the moment.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border p-4 rounded-md shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-medium">From: {request.sender_email}</p>
                <p className="text-sm text-gray-500">
                  Request ID: {request.id}
                </p>
              </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
