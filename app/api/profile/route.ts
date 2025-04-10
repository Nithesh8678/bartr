import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { saveUserSkills } from "@/lib/services/user-skills"; // Reuse the skill saving logic

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth Error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get request body
    const {
      userId,
      name,
      bio,
      location,
      timezone,
      offeredSkills,
      neededSkills,
    } = await request.json();

    // 3. Security check: Ensure the authenticated user matches the userId in the request
    if (userId !== user.id) {
      console.warn(
        `Auth mismatch: user ${user.id} tried to update profile for ${userId}`
      );
      return NextResponse.json(
        { error: "Forbidden: You can only update your own profile." },
        { status: 403 }
      );
    }

    // 4. Upsert user profile information
    const { error: profileUpsertError } = await supabase.from("users").upsert(
      {
        id: user.id,
        name: name,
        email: user.email, // Keep email consistent from auth
        bio: bio,
        location: location,
        timezone: timezone,
        // Optionally update last_active_at or other fields
        // last_active_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    ); // Specify the conflict column

    if (profileUpsertError) {
      console.error("Profile Upsert Error:", profileUpsertError);
      return NextResponse.json(
        {
          error: "Failed to update profile info",
          details: profileUpsertError.message,
        },
        { status: 500 }
      );
    }
    console.log(`Profile info updated for user ${user.id}`);

    // 5. Save user skills using the existing service function
    // This function handles finding/creating skills and linking them
    const skillsResult = await saveUserSkills(
      user.id,
      offeredSkills || [],
      neededSkills || []
    );

    if (!skillsResult.success) {
      console.error("Save Skills Error:", skillsResult.error);
      // The error object from saveUserSkills might already be a PostgrestError
      const errorDetails =
        skillsResult.error instanceof Error
          ? skillsResult.error.message
          : JSON.stringify(skillsResult.error);
      return NextResponse.json(
        { error: "Failed to save skills", details: errorDetails },
        { status: 500 }
      );
    }
    console.log(`Skills updated for user ${user.id}`);

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: "Profile and skills updated successfully.",
    });
  } catch (error) {
    console.error("Error in POST /api/profile:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
