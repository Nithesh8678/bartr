import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { saveUserSkills } from "@/lib/services/user-skills"; // Reuse the skill saving logic

export async function POST(request: NextRequest) {
  console.log("Received request for /api/saveProfile");
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    console.log("Checking authentication...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth Error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`User ${user.id} authenticated.`);

    // 2. Get request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log("Request body parsed:", requestBody);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      userId,
      name,
      bio,
      location,
      timezone,
      offeredSkills,
      neededSkills,
    } = requestBody;

    // Basic validation
    if (!userId || !name) {
      console.error("Validation failed: Missing userId or name");
      return NextResponse.json(
        { error: "Missing required fields (userId, name)" },
        { status: 400 }
      );
    }

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
    console.log(`User ${user.id} is authorized to update profile.`);

    // 4. Upsert user profile information
    console.log("Upserting user profile info...");
    const profilePayload = {
      id: user.id,
      name: name,
      email: user.email, // Keep email consistent from auth
      bio: bio,
      location: location,
      timezone: timezone,
      // last_active_at: new Date().toISOString(), // Optional: update activity timestamp
    };
    console.log("Profile payload:", profilePayload);

    const { error: profileUpsertError } = await supabase
      .from("users")
      .upsert(profilePayload, { onConflict: "id" }); // Specify the conflict column

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
    console.log(`Profile info updated successfully for user ${user.id}.`);

    // 5. Save user skills using the existing service function
    console.log("Saving user skills...");
    const skillsResult = await saveUserSkills(
      user.id,
      offeredSkills || [],
      neededSkills || []
    );

    if (!skillsResult.success) {
      console.error("Save Skills Error:", skillsResult.error);
      const errorDetails =
        skillsResult.error instanceof Error
          ? skillsResult.error.message
          : JSON.stringify(skillsResult.error);
      return NextResponse.json(
        { error: "Failed to save skills", details: errorDetails },
        { status: 500 }
      );
    }
    console.log(`Skills updated successfully for user ${user.id}.`);

    // 6. Return success response
    console.log("Sending success response.");
    return NextResponse.json({
      success: true,
      message: "Profile and skills updated successfully.",
    });
  } catch (error) {
    console.error("Error in POST /api/saveProfile:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
