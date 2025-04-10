import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

interface Skill {
  id: string;
  name: string;
}

interface NeedingUser {
  id: string;
  skillsNeeded: Skill[];
}

interface PotentialProvider {
  id: string;
  name: string;
  bio?: string;
  skillsOffered: Skill[];
}

interface AiMatchResult {
  userId: string;
  name: string;
  bio: string;
  skills_offered: string[];
  relevance_score: number;
}

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY || "");

const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export async function POST(request: NextRequest) {
  console.log("POST /api/aiMatch received");
  if (!API_KEY) {
    console.error("GEMINI_API_KEY not configured.");
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 }
    );
  }

  try {
    const supabase = await createClient();

    // --- 1. Get Authenticated User ---
    console.log("Authenticating user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication Error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`User ${user.id} authenticated.`);

    // --- 2. Fetch Current User's Needed Skills ---
    console.log(`Fetching needed skills for user ${user.id}...`);
    const { data: neededSkillsData, error: neededSkillsError } = await supabase
      .from("user_skills")
      .select("skills!inner( id, name )")
      .eq("user_id", user.id)
      .eq("is_offering", false);

    if (neededSkillsError) {
      console.error("Error fetching needed skills:", neededSkillsError);
      return NextResponse.json(
        {
          error: "Failed to fetch user needs",
          details: neededSkillsError.message,
        },
        { status: 500 }
      );
    }

    const currentUser: NeedingUser = {
      id: user.id,
      skillsNeeded:
        neededSkillsData?.map((s: any) => s.skills).filter(Boolean) || [],
    };
    console.log(
      `User ${user.id} needs:`,
      currentUser.skillsNeeded.map((s) => s.name)
    );

    if (currentUser.skillsNeeded.length === 0) {
      console.log(`User ${user.id} has no needed skills specified.`);
      return NextResponse.json([], { status: 200 });
    }

    // --- 3. Fetch Potential Providers and Their Offered Skills ---
    console.log("Fetching potential providers...");
    const { data: providersData, error: providersError } = await supabase
      .from("users")
      .select(
        `
          id,
          name,
          bio,
          user_skills!inner (
            is_offering,
            skills!inner ( id, name )
          )
        `
      )
      .neq("id", user.id)
      .eq("user_skills.is_offering", true);

    if (providersError) {
      console.error("Error fetching providers:", providersError);
      return NextResponse.json(
        {
          error: "Failed to fetch potential providers",
          details: providersError.message,
        },
        { status: 500 }
      );
    }

    // Process provider data to group skills per user
    const providersMap = new Map<string, PotentialProvider>();
    providersData?.forEach((profile: any) => {
      const userId = profile.id;
      if (!providersMap.has(userId)) {
        providersMap.set(userId, {
          id: profile.id,
          name: profile.name,
          bio: profile.bio,
          skillsOffered: [],
        });
      }
      const userEntry = providersMap.get(userId)!;
      profile.user_skills?.forEach((us: any) => {
        if (us.skills) {
          if (!userEntry.skillsOffered.some((s) => s.id === us.skills.id)) {
            userEntry.skillsOffered.push(us.skills);
          }
        }
      });
    });
    const potentialProviders: PotentialProvider[] = Array.from(
      providersMap.values()
    ).filter((p) => p.skillsOffered.length > 0);

    console.log(`Found ${potentialProviders.length} potential providers.`);

    if (potentialProviders.length === 0) {
      console.log("No potential providers found.");
      return NextResponse.json([], { status: 200 });
    }

    // --- 4. Attempt AI Matching via Gemini ---
    let aiMatches: AiMatchResult[] = [];
    let useFallback = false;
    try {
      console.log("Attempting AI match via Gemini...");
      const prompt = constructGeminiPrompt(currentUser, potentialProviders);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });

      const response = result.response;
      const responseText = response.text();
      console.log("Gemini Raw Response Text:", responseText);

      // Attempt to parse the response
      try {
        // Clean the response: Remove potential markdown backticks and ensure it starts/ends with []
        let cleanedText = responseText.trim();
        if (cleanedText.startsWith("```json"))
          cleanedText = cleanedText.substring(7);
        if (cleanedText.endsWith("```"))
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        cleanedText = cleanedText.trim();

        if (cleanedText.startsWith("[") && cleanedText.endsWith("]")) {
          aiMatches = JSON.parse(cleanedText) as AiMatchResult[];
          console.log(`Gemini returned ${aiMatches.length} matches.`);
        } else {
          console.warn("Gemini response was not a valid JSON array.");
          useFallback = true;
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON response:", parseError);
        useFallback = true;
      }
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      useFallback = true;
    }

    // --- 5. Fallback Logic if AI fails or returns no results ---
    let finalMatches: AiMatchResult[] = [];
    if (useFallback || aiMatches.length === 0) {
      console.warn(
        `Using fallback matching logic (AI Error: ${useFallback}, Matches Found: ${aiMatches.length}).`
      );
      // Simple overlap score
      finalMatches = potentialProviders
        .map((provider) => {
          const matchedSkills = provider.skillsOffered.filter((offered) =>
            currentUser.skillsNeeded.some((needed) => needed.id === offered.id)
          );
          const score = Math.min(10, Math.max(1, matchedSkills.length * 2));
          return {
            userId: provider.id,
            name: provider.name,
            bio: provider.bio || "",
            skills_offered: provider.skillsOffered.map((s) => s.name),
            relevance_score: score,
          };
        })
        .filter((provider) => provider.relevance_score > 1)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 20);
    } else {
      finalMatches = aiMatches;
    }

    console.log(`Returning ${finalMatches.length} matches.`);
    return NextResponse.json(finalMatches);
  } catch (error) {
    console.error("Unexpected Error in /api/aiMatch:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}

function constructGeminiPrompt(
  currentUser: NeedingUser,
  potentialProviders: PotentialProvider[]
): string {
  const requesterNeedsJSON = JSON.stringify(
    {
      userId: currentUser.id,
      skills_needed: currentUser.skillsNeeded.map((s) => s.name),
    },
    null,
    2
  );

  const providersJSON = JSON.stringify(
    potentialProviders.map((p) => ({
      userId: p.id,
      name: p.name,
      bio: p.bio || "",
      skills_offered: p.skillsOffered.map((s) => s.name),
    })),
    null,
    2
  );

  return `
    You are an AI assistant acting as an expert skill-matching engine for a skill-exchange platform. Your goal is to find the best potential collaborators for a user based on their needs and others' offerings.

    **Context:**
    A user is looking for help with specific skills. You are given the user's needed skills and a list of other users (potential providers) along with their offered skills, names, and bios.

    **Requester Information:**
    ${requesterNeedsJSON}

    **Potential Providers Information:**
    ${providersJSON}

    **Task:**
    1.  Analyze the requester's needed skills.
    2.  Evaluate each potential provider based on how well their offered skills align with the requester's needs. Consider both the **number** of matching skills and the potential **relevance** of the provider's overall profile (bio might offer context, but skill match is primary).
    3.  Assign a **relevance_score** from 1 to 10 to each provider, where 10 represents a perfect or near-perfect match for the requester's needs, and 1 represents a minimal or tangential overlap.
    4.  Rank the providers based on their \`relevance_score\` in descending order (highest score first).
    5.  Return **only** the top 10 best-matching providers. If fewer than 10 matches are found, return all matches.

    **Output Format:**
    Respond **only** with a single JSON array containing objects for each matched provider. Each object in the array must have the following structure:
    \`\`\`json
    [\n      {\n        "userId": "string",\n        "name": "string",\n        "bio": "string",\n        "skills_offered": ["string", "..."],\n        "relevance_score": number\n      }\n      // ... up to 10 objects\n    ]
    \`\`\`

    **Important Constraints:**
    - Output valid JSON array only.
    - Include providers with a relevance score >= 3.
    - If no suitable matches, return an empty JSON array \`[]\`
    - Sort by \`relevance_score\` descending.
    - No explanations before/after the JSON.
    `;
}
