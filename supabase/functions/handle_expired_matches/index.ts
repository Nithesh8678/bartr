// This Edge Function will check for expired matches and process refunds

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Use Supabase service role key (secret) for admin privileges
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

    const processedMatches = [];
    const failedMatches = [];

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
            failedMatches.push({ id: match.id, error: error.message });
            continue;
          }

          console.log(`Successfully processed expired match ${match.id}`);
          processedMatches.push(match.id);
        } catch (err) {
          console.error(`Error processing match ${match.id}:`, err);
          failedMatches.push({ id: match.id, error: String(err) });
        }
      }
    }

    console.log("Expired matches check completed");

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedMatches,
        failed: failedMatches,
        total_expired: expiredMatches?.length || 0,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in expired matches job:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
