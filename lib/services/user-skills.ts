"use server";

import { createClient } from "@/app/utils/supabase/server";
import { User, Skill, UserSkill } from "../interfaces/user";

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
    // Verify that the tables exist
    const { data: tableCheck, error: tablesError } = await supabase
      .from("skills")
      .select("*")
      .limit(1);

    console.log("Table check result:", { tableCheck, tablesError });

    if (tablesError) {
      console.error("Error verifying skills table:", tablesError);
      return {
        success: false,
        error: tablesError,
      };
    }

    // Check the actual column names in the skills table
    const { data: skillsTableInfo, error: infoError } = await supabase.rpc(
      "get_table_info",
      { table_name: "skills" }
    );

    console.log("Skills table info:", skillsTableInfo);

    if (infoError) {
      console.log("Cannot get table info:", infoError);
    }

    // Step 1: Get existing skills from the database
    const { data: existingSkills, error: skillsError } = await supabase
      .from("skills")
      .select("*");

    console.log("Existing skills:", { existingSkills, skillsError });

    if (skillsError) {
      return {
        success: false,
        error: skillsError,
      };
    }

    const existingSkillNames =
      existingSkills?.map((skill) => skill.name.toLowerCase()) || [];
    const existingSkillMap = new Map(
      existingSkills?.map((skill) => [skill.name.toLowerCase(), skill.id]) || []
    );

    // Step 2: Find skills to create (ones that don't exist yet)
    const allUniqueSkills = [
      ...new Set([
        ...offeredSkills.map((s) => s.toLowerCase()),
        ...neededSkills.map((s) => s.toLowerCase()),
      ]),
    ];

    const skillsToCreate = allUniqueSkills.filter(
      (skill) => !existingSkillNames.includes(skill)
    );

    console.log("Skills to create:", skillsToCreate);

    // Step 3: Create new skills
    for (const skillName of skillsToCreate) {
      const { data, error } = await supabase
        .from("skills")
        .insert({ name: skillName })
        .select("id, name");

      if (error) {
        console.error("Error creating skill:", { skillName, error });
        throw error;
      }

      if (data && data[0]) {
        existingSkillMap.set(data[0].name.toLowerCase(), data[0].id);
      }
    }

    // Step 4: Delete existing user_skills for this user
    const { error: deleteError } = await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting existing user skills:", deleteError);
      throw deleteError;
    }

    // Step 5: Create user skills for offered skills
    const offeredUserSkills = offeredSkills.map((skill) => ({
      user_id: userId,
      skill_id: existingSkillMap.get(skill.toLowerCase()),
      is_offering: true,
    }));

    console.log("Offered user skills to insert:", offeredUserSkills);

    if (offeredUserSkills.length > 0) {
      const { error: offeredError } = await supabase
        .from("user_skills")
        .insert(offeredUserSkills);

      if (offeredError) {
        console.error("Error inserting offered skills:", offeredError);
        throw offeredError;
      }
    }

    // Step 6: Create user skills for needed skills
    const neededUserSkills = neededSkills.map((skill) => ({
      user_id: userId,
      skill_id: existingSkillMap.get(skill.toLowerCase()),
      is_offering: false,
    }));

    console.log("Needed user skills to insert:", neededUserSkills);

    if (neededUserSkills.length > 0) {
      const { error: neededError } = await supabase
        .from("user_skills")
        .insert(neededUserSkills);

      if (neededError) {
        console.error("Error inserting needed skills:", neededError);
        throw neededError;
      }
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
    // Get user skills joined with skill names
    const { data, error } = await supabase
      .from("user_skills")
      .select(
        `
        id,
        is_offering,
        skills:skill_id (id, name)
      `
      )
      .eq("user_id", userId);

    if (error) throw error;

    // Check if data exists and is in the correct format
    if (!data || !Array.isArray(data)) {
      console.error("Unexpected data format:", data);
      return {
        success: false,
        error: "Invalid data format",
        offeredSkills: [],
        neededSkills: [],
      };
    }

    // Separate into offered and needed skills
    const offeredSkills = data
      .filter((record: any) => record.is_offering)
      .map((record: any) => {
        // Safely extract the skill name
        if (
          typeof record.skills === "object" &&
          record.skills &&
          "name" in record.skills
        ) {
          return record.skills.name;
        }
        return null;
      })
      .filter(Boolean);

    const neededSkills = data
      .filter((record: any) => !record.is_offering)
      .map((record: any) => {
        // Safely extract the skill name
        if (
          typeof record.skills === "object" &&
          record.skills &&
          "name" in record.skills
        ) {
          return record.skills.name;
        }
        return null;
      })
      .filter(Boolean);

    return {
      success: true,
      offeredSkills,
      neededSkills,
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
