"use server";

import { createClient } from "@/app/utils/supabase/server";
import { User } from "../interfaces/user";

/**
 * Saves a user's skills to the database
 * @param userId - The user's ID
 * @param offeredSkills - Array of skill names the user offers
 * @param neededSkills - Array of skill names the user needs
 */
export async function saveUserSkills(
  userId: string,
  offeredSkills: string[],
  neededSkills: string[]
) {
  console.log("saveUserSkills called with:", {
    userId,
    offeredSkills,
    neededSkills,
  });
  const supabase = await createClient();

  try {
    // Update the user's skills and skillsRequired fields
    const { error: updateError } = await supabase
      .from("users")
      .update({
        skills: offeredSkills,
        skillsRequired: neededSkills,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user skills:", updateError);
      return {
        success: false,
        error: updateError,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving user skills:", error);
    return { success: false, error };
  }
}

/**
 * Gets a user's skills from the database
 * @param userId - The user's ID
 * @returns Object containing offered and needed skills
 */
export async function getUserSkills(userId: string) {
  const supabase = await createClient();

  try {
    // Get user with skills and skillsRequired fields
    const { data, error } = await supabase
      .from("users")
      .select("skills, skillsRequired")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return {
      success: true,
      offeredSkills: data.skills || [],
      neededSkills: data.skillsRequired || [],
    };
  } catch (error) {
    console.error("Error getting user skills:", error);
    return {
      success: false,
      error,
      offeredSkills: [],
      neededSkills: [],
    };
  }
}
