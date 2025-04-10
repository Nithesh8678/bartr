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

    // 3. Insert Swipe Record
    const { error: insertSwipeError } = await supabase.from("swipes").insert({
      swiper_id: swiperId,
      swiped_user_id: swipedUserId,
      direction: direction,
    });

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
        `Checking for mutual like from ${swipedUserId} to ${swiperId}...`
      );
      const { data: reverseSwipe, error: checkMatchError } = await supabase
        .from("swipes")
        .select("id")
        .eq("swiper_id", swipedUserId) // The other user
        .eq("swiped_user_id", swiperId) // Swiped on the current user
        .eq("direction", "like") // And it was a 'like'
        .maybeSingle(); // Use maybeSingle as there might be 0 or 1

      if (checkMatchError) {
        console.error("Error checking for mutual like:", checkMatchError);
        // Decide if this should be a hard error or just log it
        // For now, we proceed without creating a match if check fails
      } else if (reverseSwipe) {
        // --- MATCH FOUND! ---
        console.log(
          `Mutual like detected between ${swiperId} and ${swipedUserId}!`
        );
        matchCreated = true;

        // Ensure consistent order for user1_id and user2_id
        const user1 = swiperId < swipedUserId ? swiperId : swipedUserId;
        const user2 = swiperId > swipedUserId ? swiperId : swipedUserId;

        const { error: insertMatchError } = await supabase
          .from("matches")
          .insert({ user1_id: user1, user2_id: user2 });

        if (insertMatchError && insertMatchError.code !== "23505") {
          // Ignore duplicate match error
          console.error("Error inserting match:", insertMatchError);
          // Decide how critical this is. Maybe the match exists.
          // For robustness, you might query if the match exists before inserting.
        } else if (insertMatchError && insertMatchError.code === "23505") {
          console.log(`Match already exists between ${user1} and ${user2}.`);
          // Match already exists, which is fine.
        } else {
          console.log(
            `Match created successfully between ${user1} and ${user2}.`
          );
        }
      }
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
