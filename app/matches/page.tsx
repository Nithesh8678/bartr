import { createClient } from "@/app/utils/supabase/server";
import MatchesClient from "./MatchesClient";

interface MatchData {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
  stake_status_user1: boolean;
  stake_status_user2: boolean;
  is_chat_enabled: boolean;
  project_submitted_user1: boolean;
  project_submitted_user2: boolean;
  stake_amount: number;
  project_end_date: string | null;
  work_description: string | null;
  partner_email?: string;
  partner_name?: string;
}

export default async function MatchesPage() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <div className="p-4">Please sign in to view your matches</div>;
  }

  const userId = authData.user.id;

  // Fetch all matches where the current user is either user1 or user2
  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq("status", "active");

  if (matchesError) {
    console.error("Error fetching matches:", matchesError);
    return <div className="p-4 text-red-500">Error loading matches</div>;
  }

  if (!matchesData || matchesData.length === 0) {
    return <MatchesClient initialMatches={[]} />;
  }

  // Get all partner user IDs
  const partnerIds = matchesData.map((match) =>
    match.user1_id === userId ? match.user2_id : match.user1_id
  );

  // Fetch partner user details
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, email, name")
    .in("id", partnerIds);

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return <div className="p-4 text-red-500">Error loading user details</div>;
  }

  // Create a map of user IDs to their details
  const userDetailsMap = new Map();
  usersData?.forEach((user) => {
    userDetailsMap.set(user.id, {
      email: user.email,
      name: user.name || user.email.split("@")[0], // Use name or username from email
    });
  });

  // Combine the data
  const combinedMatches: MatchData[] = matchesData.map((match) => {
    const partnerId =
      match.user1_id === userId ? match.user2_id : match.user1_id;
    const partnerDetails = userDetailsMap.get(partnerId);

    return {
      id: match.id,
      user1_id: match.user1_id,
      user2_id: match.user2_id,
      status: match.status,
      created_at: match.created_at,
      stake_status_user1: match.stake_status_user1 || false,
      stake_status_user2: match.stake_status_user2 || false,
      is_chat_enabled: match.is_chat_enabled || false,
      project_submitted_user1: match.project_submitted_user1 || false,
      project_submitted_user2: match.project_submitted_user2 || false,
      stake_amount: match.stake_amount || 10,
      project_end_date: match.project_end_date,
      work_description: match.work_description,
      partner_email: partnerDetails?.email || "Unknown",
      partner_name: partnerDetails?.name || "Unknown",
    };
  });

  return <MatchesClient initialMatches={combinedMatches} />;
}
