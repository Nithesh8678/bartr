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

interface PendingRequestsClientProps {
  initialRequests: OutgoingRequest[];
}

export default function PendingRequestsClient({
  initialRequests,
}: PendingRequestsClientProps) {
  const [requests, setRequests] = useState<OutgoingRequest[]>(initialRequests);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("pending_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_requests",
        },
        async (payload) => {
          // Handle the real-time update
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const newRequest = payload.new as {
              id: string;
              sender_id: string;
              receiver_id: string;
              status: string;
            };

            // Fetch the receiver's email
            const { data: userData } = await supabase
              .from("users")
              .select("email")
              .eq("id", newRequest.receiver_id)
              .single();

            const updatedRequest: OutgoingRequest = {
              ...newRequest,
              receiver_email: userData?.email || "Unknown",
            };

            setRequests((prevRequests) => {
              if (payload.eventType === "INSERT") {
                return [...prevRequests, updatedRequest];
              } else {
                return prevRequests.map((req) =>
                  req.id === updatedRequest.id ? updatedRequest : req
                );
              }
            });
          } else if (payload.eventType === "DELETE") {
            setRequests((prevRequests) =>
              prevRequests.filter((req) => req.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
