import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch other users and their skills
    // Exclude the current user
    const { data: potentialMatches, error: fetchError } = await supabase
      .from("users")
      .select(
        `
        id,
        name,
        bio,
        profile_image_url,
        location,
        timezone,
        skills,
        skillsRequired
      `
      )
      .neq("id", user.id);
    // Add any other filtering logic here (e.g., location, already swiped, etc.)
    // .limit(20) // Limit results for performance

    if (fetchError) {
      console.error("Error fetching potential matches:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch users", details: fetchError.message },
        { status: 500 }
      );
    }

    // 3. Process the data to format user profiles
    const formattedUsers =
      potentialMatches?.map((profile) => ({
        id: profile.id,
        name: profile.name,
        bio: profile.bio,
        profile_image_url: profile.profile_image_url,
        location: profile.location,
        timezone: profile.timezone,
        skillsOffered: profile.skills || [],
        skillsNeeded: profile.skillsRequired || [],
      })) || [];

    // 4. Return the processed user data
    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Error in GET /api/browse-users:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
