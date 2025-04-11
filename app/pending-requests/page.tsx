"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";

interface OutgoingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  receiver_email: string;
}

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<OutgoingRequest[]>([]);
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
      console.log("Fetching outgoing requests for user:", userId);

      // First, fetch the outgoing requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("pending_requests")
        .select("id, sender_id, receiver_id, status")
        .eq("sender_id", userId);

      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
        throw requestsError;
      }

      console.log("Outgoing requests:", requestsData);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Then, fetch the receiver emails
      const receiverIds = requestsData.map((req) => req.receiver_id);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email")
        .in("id", receiverIds);

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
        receiver_email: userEmailMap.get(request.receiver_id) || "Unknown",
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Outgoing Requests</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No outgoing requests at the moment.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border p-4 rounded-md shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">To: {request.receiver_email}</p>
                  <p className="text-sm text-gray-500">
                    Request ID: {request.id}
                  </p>
                </div>
                <div className="flex items-center">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      request.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : request.status === "accepted"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
