"use server";

import { createClient } from "@/app/utils/supabase/server";

/**
 * Get the wallet balance for a user
 * @param userId - The user's ID
 */
export async function getWalletBalance(userId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // User entry doesn't exist, create one with 0 credits
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .update({ credits: 0 })
          .eq("id", userId)
          .select("credits")
          .single();

        if (createError) {
          console.error("Error creating user credits:", createError);
          return { success: false, error: createError };
        }

        return { success: true, balance: newUser.credits };
      }
      console.error("Error fetching user credits:", error);
      return { success: false, error };
    }

    return { success: true, balance: data.credits };
  } catch (error) {
    console.error("Error in getWalletBalance:", error);
    return { success: false, error };
  }
}

/**
 * Update the wallet balance for a user
 * @param userId - The user's ID
 * @param amount - The amount to add to the wallet
 */
export async function updateWalletBalance(userId: string, amount: number) {
  const supabase = await createClient();

  try {
    // First, get the current wallet or create one if it doesn't exist
    const { data: wallet, error: fetchError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching wallet:", fetchError);
      return { success: false, error: fetchError };
    }

    const currentBalance = wallet?.credits || 0;
    const newBalance = currentBalance + amount;

    // Update or insert the wallet
    const { data, error } = await supabase
      .from("users")
      .update({ credits: newBalance })
      .eq("id", userId)
      .select("credits")
      .single();

    if (error) {
      console.error("Error updating wallet:", error);
      return { success: false, error };
    }

    return { success: true, balance: data.credits };
  } catch (error) {
    console.error("Error in updateWalletBalance:", error);
    return { success: false, error };
  }
}

/**
 * Award credits to both users after successful barter completion
 * @param user1Id - The first user's ID
 * @param user2Id - The second user's ID
 * @param matchId - The match ID
 * @param amount - The amount of credits to award (default 10)
 */
export async function awardBarterCompletionCredits(
  user1Id: string,
  user2Id: string,
  amount: number = 10
) {
  const supabase = await createClient();

  try {
    // Fetch current credits for both users in parallel
    const [
      { data: user1Data, error: error1 },
      { data: user2Data, error: error2 },
    ] = await Promise.all([
      supabase.from("users").select("credits").eq("id", user1Id).single(),
      supabase.from("users").select("credits").eq("id", user2Id).single(),
    ]);

    if (error1 || error2) {
      console.error("Error fetching user credits:", error1 || error2);
      return { success: false, error: error1 || error2 };
    }

    const user1NewCredits = (user1Data?.credits || 0) + amount;
    const user2NewCredits = (user2Data?.credits || 0) + amount;

    // Update credits for both users in parallel
    const [{ error: updateError1 }, { error: updateError2 }] =
      await Promise.all([
        supabase
          .from("users")
          .update({ credits: user1NewCredits })
          .eq("id", user1Id),
        supabase
          .from("users")
          .update({ credits: user2NewCredits })
          .eq("id", user2Id),
      ]);

    if (updateError1 || updateError2) {
      console.error(
        "Error updating user credits:",
        updateError1 || updateError2
      );
      return { success: false, error: updateError1 || updateError2 };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in awardBarterCompletionCredits:", error);
    return { success: false, error };
  }
}
