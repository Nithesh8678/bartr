import PendingRequestsClient from "./PendingRequestsClient";
import { createClient } from "../utils/supabase/server";

interface OutgoingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  receiver_email: string;
}

export default async function PendingRequestsPage() {
  const supabase = await createClient();

  // Get current user ID
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <div>Please sign in to view your requests</div>;
  }

  const userId = authData.user.id;

  // Fetch the outgoing requests
  const { data: requestsData } = await supabase
    .from("pending_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("sender_id", userId);

  if (!requestsData || requestsData.length === 0) {
    return <PendingRequestsClient initialRequests={[]} />;
  }

  // Fetch the receiver emails
  const receiverIds = requestsData.map((req) => req.receiver_id);

  const { data: usersData } = await supabase
    .from("users")
    .select("id, email")
    .in("id", receiverIds);

  // Create a map of user IDs to emails
  const userEmailMap = new Map();
  usersData?.forEach((user) => {
    userEmailMap.set(user.id, user.email);
  });

  // Combine the data
  const initialRequests: OutgoingRequest[] = requestsData.map((request) => ({
    id: request.id,
    sender_id: request.sender_id,
    receiver_id: request.receiver_id,
    status: request.status,
    receiver_email: userEmailMap.get(request.receiver_id) || "Unknown",
  }));

  return <PendingRequestsClient initialRequests={initialRequests} />;
}
