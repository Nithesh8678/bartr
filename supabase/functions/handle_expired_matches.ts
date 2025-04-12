// This function will be run as a scheduled function in Supabase
// to check for expired matches and refund credits to users who have submitted

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set interval to run this function (e.g., once a day)
Deno.cron("Check expired matches", "0 0 * * *", async () => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting expired matches check...");

    // Get current date
    const currentDate = new Date().toISOString();

    // Find matches that have expired (project_end_date is in the past)
    const { data: expiredMatches, error: queryError } = await supabase
      .from("matches")
      .select(
        "id, stake_status_user1, stake_status_user2, project_submitted_user1, project_submitted_user2"
      )
      .lt("project_end_date", currentDate)
      .not("project_submitted_user1", "eq", "project_submitted_user2") // Only where one user has submitted but not both
      .eq("is_chat_enabled", true); // Only consider matches where chat has been enabled (both staked)

    if (queryError) {
      throw new Error(`Error querying expired matches: ${queryError.message}`);
    }

    console.log(`Found ${expiredMatches?.length || 0} expired matches`);

    // Process each expired match
    if (expiredMatches && expiredMatches.length > 0) {
      for (const match of expiredMatches) {
        try {
          // Call the handle_expired_match function
          const { data, error } = await supabase.rpc("handle_expired_match", {
            p_match_id: match.id,
          });

          if (error) {
            console.error(
              `Failed to process match ${match.id}: ${error.message}`
            );
            continue;
          }

          console.log(`Successfully processed expired match ${match.id}`);
        } catch (err) {
          console.error(`Error processing match ${match.id}:`, err);
        }
      }
    }

    console.log("Expired matches check completed");
  } catch (error) {
    console.error("Error in expired matches job:", error);
  }
});
