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
    // Join with user_skills and skills tables
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
        user_skills!inner (
          is_offering,
          skills!inner (
            id,
            name
          )
        )
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

    // 3. Process the data to group skills by user
    const usersMap = new Map();

    potentialMatches?.forEach((profile) => {
      const userId = profile.id;
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: profile.id,
          name: profile.name,
          bio: profile.bio,
          profile_image_url: profile.profile_image_url,
          location: profile.location,
          timezone: profile.timezone,
          skillsOffered: [],
          skillsNeeded: [],
        });
      }

      const userEntry = usersMap.get(userId);

      profile.user_skills?.forEach((userSkill: any) => {
        if (userSkill.is_offering) {
          // Avoid duplicates
          if (
            !userEntry.skillsOffered.some(
              (s: any) => s.id === userSkill.skills.id
            )
          ) {
            userEntry.skillsOffered.push(userSkill.skills);
          }
        } else {
          // Avoid duplicates
          if (
            !userEntry.skillsNeeded.some(
              (s: any) => s.id === userSkill.skills.id
            )
          ) {
            userEntry.skillsNeeded.push(userSkill.skills);
          }
        }
      });
    });

    const uniqueUsers = Array.from(usersMap.values());

    // 4. Return the processed user data
    return NextResponse.json(uniqueUsers);
  } catch (error) {
    console.error("Error in GET /api/browse-users:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
