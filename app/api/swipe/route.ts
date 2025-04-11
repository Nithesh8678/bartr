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
      console.log(`Processing right swipe: ${swiperId} likes ${swipedUserId}`);

      // Create a pending request
      const { data: pendingRequest, error: pendingRequestError } =
        await supabase
          .from("pending_requests")
          .insert({
            sender_id: swiperId,
            receiver_id: swipedUserId,
            status: "pending",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

      if (pendingRequestError) {
        console.error("Error creating pending request:", pendingRequestError);
        return NextResponse.json(
          {
            error: "Failed to create pending request",
            details: pendingRequestError.message,
          },
          { status: 500 }
        );
      }

      console.log("Created pending request:", pendingRequest);
    }

    // 5. Return Success Response
    console.log(
      `Swipe recorded. Pending request created: ${direction === "like"}`
    );
    return NextResponse.json({
      success: true,
      pendingRequestCreated: direction === "like",
    });
  } catch (error) {
    console.error("Unexpected Error in /api/swipe:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
