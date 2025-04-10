import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const result: any = {
      tables: {},
      errors: [],
    };

    // Check skills table
    try {
      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("*")
        .limit(5);

      result.tables.skills = {
        exists: !skillsError,
        error: skillsError,
        schema:
          skillsData && skillsData.length > 0 ? Object.keys(skillsData[0]) : [],
        sample: skillsData,
      };
    } catch (error) {
      result.errors.push({
        source: "skills_check",
        error: String(error),
      });
    }

    // Check users table
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .limit(5);

      result.tables.users = {
        exists: !usersError,
        error: usersError,
        schema:
          usersData && usersData.length > 0 ? Object.keys(usersData[0]) : [],
        sample: usersData,
      };
    } catch (error) {
      result.errors.push({
        source: "users_check",
        error: String(error),
      });
    }

    // Check user_skills table
    try {
      const { data: userSkillsData, error: userSkillsError } = await supabase
        .from("user_skills")
        .select("*")
        .limit(5);

      result.tables.user_skills = {
        exists: !userSkillsError,
        error: userSkillsError,
        schema:
          userSkillsData && userSkillsData.length > 0
            ? Object.keys(userSkillsData[0])
            : [],
        sample: userSkillsData,
      };
    } catch (error) {
      result.errors.push({
        source: "user_skills_check",
        error: String(error),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error checking database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
