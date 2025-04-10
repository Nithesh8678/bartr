import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function POST(request: NextRequest) {
  console.log("POST /api/swipe received");
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

    // 2. Get Swipe Data from Request Body
    let swipeData;
    try {
      swipeData = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { swipedUserId, direction } = swipeData;

    // Validate input
    if (!swipedUserId || (direction !== "like" && direction !== "skip")) {
      return NextResponse.json(
        {
          error: "Missing or invalid required fields (swipedUserId, direction)",
        },
        { status: 400 }
      );
    }

    const swiperId = user.id;

    // Prevent swiping self
    if (swiperId === swipedUserId) {
      return NextResponse.json(
        { error: "Cannot swipe on yourself" },
        { status: 400 }
      );
    }

    console.log(`Processing swipe: ${swiperId} ${direction}s ${swipedUserId}`);

    // --- Log the data being inserted ---
    const swipePayload = {
      swiper_id: swiperId,
      swiped_user_id: swipedUserId,
      direction: direction, // Log the exact value
    };
    console.log("[DEBUG] Inserting swipe payload:", swipePayload);
    // --- End Logging ---

    // 3. Insert Swipe Record
    const { error: insertSwipeError } = await supabase
      .from("swipes")
      .insert(swipePayload); // Use the logged payload

    // Handle potential duplicate swipe error gracefully (e.g., user swiped already)
    if (insertSwipeError && insertSwipeError.code !== "23505") {
      // 23505 = unique_violation
      console.error("Error inserting swipe:", insertSwipeError);
      return NextResponse.json(
        { error: "Failed to record swipe", details: insertSwipeError.message },
        { status: 500 }
      );
    }
    if (insertSwipeError && insertSwipeError.code === "23505") {
      console.log(
        `Duplicate swipe attempt ignored: ${swiperId} on ${swipedUserId}`
      );
      // Optionally, update the existing swipe's timestamp or direction if needed
    }

    // 4. Check for Mutual Like (Match) - Only if the current swipe is a 'like'
    let matchCreated = false;
    if (direction === "like") {
      console.log(
        `Checking for mutual like: Does user ${swipedUserId} have a 'like' swipe for user ${swiperId}?`
      );

      // Explicitly define query parameters
      const queryParams = {
        other_user_id: swipedUserId,
        current_user_id: swiperId,
        swipe_direction: "like",
      };
      console.log("Reverse swipe query params:", queryParams);

      const { data: reverseSwipe, error: checkMatchError } = await supabase
        .from("swipes")
        .select("id") // Selecting 'id' is enough
        .eq("swiper_id", queryParams.other_user_id)
        .eq("swiped_user_id", queryParams.current_user_id)
        .eq("direction", queryParams.swipe_direction)
        .maybeSingle();

      // --- Enhanced Logging ---
      if (checkMatchError) {
        console.error(
          "[DEBUG] Error checking for mutual like:",
          JSON.stringify(checkMatchError)
        );
        // Log the error but proceed (as before), match won't be created
      } else {
        console.log("[DEBUG] Result of reverse swipe query:", reverseSwipe);
        if (reverseSwipe) {
          // --- MATCH FOUND! ---
          console.log(
            `[DEBUG] Mutual like detected! Reverse swipe ID: ${reverseSwipe.id}. Proceeding to create match.`
          );
          matchCreated = true;

          // Ensure consistent order for user1_id and user2_id
          const user1 = swiperId < swipedUserId ? swiperId : swipedUserId;
          const user2 = swiperId > swipedUserId ? swiperId : swipedUserId;

          console.log(
            `[DEBUG] Attempting to insert match: User1=${user1}, User2=${user2}`
          );
          const { error: insertMatchError } = await supabase
            .from("matches")
            .insert({ user1_id: user1, user2_id: user2 });

          if (insertMatchError && insertMatchError.code !== "23505") {
            console.error(
              "[DEBUG] Error inserting match:",
              JSON.stringify(insertMatchError)
            );
            // Keep matchCreated = true because the logic implies a match exists
          } else if (insertMatchError && insertMatchError.code === "23505") {
            console.log(
              `[DEBUG] Match already exists between ${user1} and ${user2}.`
            );
          } else if (!insertMatchError) {
            console.log(
              `[DEBUG] Match created successfully between ${user1} and ${user2}.`
            );
          }
        } else {
          console.log("[DEBUG] No reverse 'like' swipe found in database.");
        }
      }
      // --- End Enhanced Logging ---
    }

    // 5. Return Success Response (including whether a match was made)
    console.log(`Swipe recorded. Match created: ${matchCreated}`);
    return NextResponse.json({ success: true, matchCreated: matchCreated });
  } catch (error) {
    console.error("Unexpected Error in /api/swipe:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
