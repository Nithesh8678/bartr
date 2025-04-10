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

    // First, check if this swipe already exists
    const { data: existingSwipe, error: checkExistingError } = await supabase
      .from("swipes")
      .select("*")
      .eq("swiper_id", swiperId)
      .eq("swiped_user_id", swipedUserId)
      .maybeSingle();

    console.log("Existing swipe check:", { existingSwipe, checkExistingError });

    // 3. Insert Swipe Record
    const { data: insertedSwipe, error: insertSwipeError } = await supabase
      .from("swipes")
      .insert({
        swiper_id: swiperId,
        swiped_user_id: swipedUserId,
        direction: direction,
      })
      .select()
      .single();

    console.log("Swipe insertion result:", { insertedSwipe, insertSwipeError });

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
      // If it's a duplicate, try to update the direction if it's different
      if (existingSwipe && existingSwipe.direction !== direction) {
        console.log(
          `Updating existing swipe direction from ${existingSwipe.direction} to ${direction}`
        );
        const { error: updateError } = await supabase
          .from("swipes")
          .update({ direction: direction })
          .eq("id", existingSwipe.id);

        if (updateError) {
          console.error("Error updating swipe direction:", updateError);
        }
      }
    }

    // Verify the swipe was recorded
    const { data: verifiedSwipe, error: verifyError } = await supabase
      .from("swipes")
      .select("*")
      .eq("swiper_id", swiperId)
      .eq("swiped_user_id", swipedUserId)
      .single();

    console.log("Verified swipe record:", { verifiedSwipe, verifyError });

    // 4. Check for Mutual Like (Match) - Only if the current swipe is a 'like'
    let matchCreated = false;
    if (direction === "like") {
      console.log(
        `Checking for mutual like: Does user ${swipedUserId} have a 'like' swipe for user ${swiperId}?`
      );

      // First, check if we can see any swipes at all
      const { data: testSwipes, error: testError } = await supabase
        .from("swipes")
        .select("*")
        .limit(5);

      console.log("Test query - can we see any swipes?", {
        testSwipes,
        testError,
      });

      // Check all swipes from the swiped user
      const { data: allSwipesFromUser, error: allSwipesError } = await supabase
        .from("swipes")
        .select("*")
        .eq("swiper_id", swipedUserId);

      console.log("All swipes from swiped user:", {
        swipes: allSwipesFromUser,
        error: allSwipesError,
        query: `swiper_id = ${swipedUserId}`,
      });

      // Check all swipes to the current user
      const { data: allSwipesToUser, error: allSwipesToUserError } =
        await supabase
          .from("swipes")
          .select("*")
          .eq("swiped_user_id", swiperId);

      console.log("All swipes to current user:", {
        swipes: allSwipesToUser,
        error: allSwipesToUserError,
        query: `swiped_user_id = ${swiperId}`,
      });

      // Try a different query approach for the reverse swipe
      const { data: reverseSwipeAlt, error: checkMatchErrorAlt } =
        await supabase
          .from("swipes")
          .select("*")
          .or(
            `and(swiper_id.eq.${swipedUserId},swiped_user_id.eq.${swiperId},direction.eq.like)`
          )
          .maybeSingle();

      console.log("Alternative reverse swipe check:", {
        reverseSwipe: reverseSwipeAlt,
        error: checkMatchErrorAlt,
        query: `swiper_id = ${swipedUserId} AND swiped_user_id = ${swiperId} AND direction = 'like'`,
      });

      // Original reverse swipe check
      const { data: reverseSwipe, error: checkMatchError } = await supabase
        .from("swipes")
        .select("*")
        .eq("swiper_id", swipedUserId)
        .eq("swiped_user_id", swiperId)
        .eq("direction", "like")
        .maybeSingle();

      console.log("Original reverse swipe check:", {
        reverseSwipe,
        checkMatchError,
        query: {
          swiper_id: swipedUserId,
          swiped_user_id: swiperId,
          direction: "like",
        },
      });

      // If we still can't find it, try a raw query
      const { data: rawQueryResult, error: rawQueryError } = await supabase.rpc(
        "get_swipe",
        {
          p_swiper_id: swipedUserId,
          p_swiped_user_id: swiperId,
          p_direction: "like",
        }
      );

      console.log("Raw query result:", { rawQueryResult, rawQueryError });

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
          // --- Add More Detailed Logging ---
          console.log("[DEBUG] Checking database for potential issues:");
          const { data: allSwipes, error: allSwipesError } = await supabase
            .from("swipes")
            .select("*")
            .eq("swiper_id", swipedUserId)
            .eq("swiped_user_id", swiperId);

          if (allSwipesError) {
            console.error(
              "[DEBUG] Error fetching all swipes:",
              JSON.stringify(allSwipesError)
            );
          } else {
            console.log("[DEBUG] All swipes between these users:", allSwipes);
            if (allSwipes.length === 0) {
              console.log(
                "[DEBUG] No swipes found at all between these users."
              );
            } else {
              console.log(
                "[DEBUG] Found swipes, but none with direction='like'."
              );
            }
          }
          // --- End More Detailed Logging ---
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
