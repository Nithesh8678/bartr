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

    // Check swipes table
    try {
      const { data: swipesData, error: swipesError } = await supabase
        .from("swipes")
        .select("*")
        .limit(5);

      result.tables.swipes = {
        exists: !swipesError,
        error: swipesError,
        schema:
          swipesData && swipesData.length > 0 ? Object.keys(swipesData[0]) : [],
        sample: swipesData,
      };
    } catch (error) {
      result.errors.push({
        source: "swipes_check",
        error: String(error),
      });
    }

    // Check matches table
    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .limit(5);

      result.tables.matches = {
        exists: !matchesError,
        error: matchesError,
        schema:
          matchesData && matchesData.length > 0
            ? Object.keys(matchesData[0])
            : [],
        sample: matchesData,
      };
    } catch (error) {
      result.errors.push({
        source: "matches_check",
        error: String(error),
      });
    }

    // Get the authenticated user's ID
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!authError && user) {
      // Check all swipes involving the current user
      const { data: userSwipes, error: userSwipesError } = await supabase
        .from("swipes")
        .select("*")
        .or(`swiper_id.eq.${user.id},swiped_user_id.eq.${user.id}`);

      result.userSwipes = {
        data: userSwipes,
        error: userSwipesError,
      };
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
