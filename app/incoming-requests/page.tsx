import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import IncomingRequestsClient from "./IncomingRequestsClient";

interface Request {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_email: string;
}

export default async function IncomingRequestsPage() {
  const supabase = await createClient();

  // Get current user ID
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <div>Please sign in to view your requests</div>;
  }

  const userId = authData.user.id;

  // Fetch the pending requests
  const { data: requestsData } = await supabase
    .from("pending_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (!requestsData || requestsData.length === 0) {
    return <IncomingRequestsClient initialRequests={[]} />;
  }

  // Fetch the sender emails
  const senderIds = requestsData.map((req) => req.sender_id);

  const { data: usersData } = await supabase
    .from("users")
    .select("id, email")
    .in("id", senderIds);

  // Create a map of user IDs to emails
  const userEmailMap = new Map();
  usersData?.forEach((user) => {
    userEmailMap.set(user.id, user.email);
  });

  // Combine the data
  const initialRequests: Request[] = requestsData.map((request) => ({
    id: request.id,
    sender_id: request.sender_id,
    receiver_id: request.receiver_id,
    status: request.status,
    sender_email: userEmailMap.get(request.sender_id) || "Unknown",
  }));

  return <IncomingRequestsClient initialRequests={initialRequests} />;
}
