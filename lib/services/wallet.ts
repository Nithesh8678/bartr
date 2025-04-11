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
        // Wallet doesn't exist, create one with 0 balance
        const { data: newWallet, error: createError } = await supabase
          .from("users")
          .insert([{ credits: 0 }])
          .select("credits")
          .single();

        if (createError) {
          console.error("Error creating wallet:", createError);
          return { success: false, error: createError };
        }

        return { success: true, balance: newWallet.credits };
      }
      console.error("Error fetching wallet:", error);
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
