import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function POST(request: NextRequest) {
  console.log("Received request for /api/saveNeededSkills");
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

    // 2. Get request body (skillsNeeded)
    let skillsNeeded;
    try {
      const requestBody = await request.json();
      console.log("Request body parsed:", requestBody);

      skillsNeeded = requestBody.skillsNeeded;

      if (!Array.isArray(skillsNeeded)) {
        throw new Error("skillsNeeded must be an array");
      }
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", details: String(parseError) },
        { status: 400 }
      );
    }

    // 3. Try a simpler update approach - first check if user exists
    const { data: userExists, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id);

    if (userCheckError) {
      console.error("Error checking user:", userCheckError);
      return NextResponse.json(
        {
          error: "Failed to check if user exists",
          details: userCheckError.message,
        },
        { status: 500 }
      );
    }

    // Prepare the update data
    const updateData = {
      skillsRequired: skillsNeeded,
    };

    console.log("Update data:", updateData);

    let result;

    // If user exists, update, otherwise insert
    if (userExists && userExists.length > 0) {
      // User exists, update their record
      console.log("User exists, updating their record");

      result = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);
    } else {
      // User doesn't exist, insert a new record
      console.log("User doesn't exist, creating a new record");

      result = await supabase.from("users").insert({
        id: user.id,
        email: user.email,
        skillsRequired: skillsNeeded,
      });
    }

    if (result.error) {
      console.error("Error updating/inserting user skills:", result.error);
      return NextResponse.json(
        { error: "Failed to save skills", details: result.error.message },
        { status: 500 }
      );
    }

    console.log("Skills updated successfully");

    // 4. Return success response
    return NextResponse.json({
      success: true,
      message: "Skills needed updated successfully.",
      redirect: "/browse",
    });
  } catch (error) {
    console.error("Error in POST /api/saveNeededSkills:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Full error details:", error);

    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
