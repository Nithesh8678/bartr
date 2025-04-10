import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function GET(request: NextRequest) {
  console.log("GET /api/skill-match received");
  try {
    const supabase = await createClient();

    // 1. Get Authenticated User
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch current user's skillsRequired
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id, skillsRequired")
      .eq("id", user.id)
      .single();

    if (currentUserError || !currentUser) {
      console.error("Error fetching current user:", currentUserError);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // 3. Fetch all other users with their skills
    const { data: otherUsers, error: otherUsersError } = await supabase
      .from("users")
      .select("id, name, bio, skills")
      .neq("id", user.id);

    if (otherUsersError) {
      console.error("Error fetching other users:", otherUsersError);
      return NextResponse.json(
        { error: "Failed to fetch potential matches" },
        { status: 500 }
      );
    }

    // 4. Format data for Gemini API
    const userSkillsRequired = currentUser.skillsRequired || [];

    // Create a structured prompt for Gemini
    const prompt = `
      You are a skill matching algorithm. Your task is to analyze the skills required by a user and match them with potential candidates based on their offered skills.
      
      User's Required Skills: ${JSON.stringify(userSkillsRequired)}
      
      Potential Candidates:
      ${JSON.stringify(otherUsers)}
      
      For each candidate, analyze how well their skills match the user's required skills.
      Consider:
      1. Direct skill matches (exact matches)
      2. Related skills (skills that are similar or complementary)
      3. The number of matching skills relative to the total required skills
      
      Return a JSON array of the top 10 most suitable candidates, sorted by relevance.
      Each candidate object should include:
      - id: The candidate's user ID
      - name: The candidate's name
      - bio: The candidate's bio
      - matchingSkills: Array of skills that matched (either directly or as related skills)
      - relevanceScore: A score from 0-10 indicating how well they match (10 being perfect match)
      
      Format the response as a valid JSON array.
    `;

    // 5. Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. Parse and validate the response
    let matchedUsers;
    try {
      // Extract JSON from the response (in case Gemini added markdown or other text)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      matchedUsers = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!Array.isArray(matchedUsers)) {
        throw new Error("Response is not an array");
      }

      // Ensure each item has the required fields
      matchedUsers = matchedUsers.map((user) => ({
        id: user.id,
        name: user.name || "Anonymous",
        bio: user.bio || "",
        matchingSkills: Array.isArray(user.matchingSkills)
          ? user.matchingSkills
          : [],
        relevanceScore:
          typeof user.relevanceScore === "number"
            ? Math.min(Math.max(user.relevanceScore, 0), 10)
            : 0,
      }));
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError, text);
      return NextResponse.json(
        { error: "Failed to process skill matching results" },
        { status: 500 }
      );
    }

    // 7. Return the matched users
    return NextResponse.json({
      success: true,
      matches: matchedUsers,
    });
  } catch (error) {
    console.error("Unexpected Error in /api/skill-match:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
