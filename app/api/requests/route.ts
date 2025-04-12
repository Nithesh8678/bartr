import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get Authenticated User
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Authenticated user:", user.id);

    // 2. Get Request Data
    const { requestId, action } = await request.json();

    if (!requestId || !action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    // 3. Get the pending request
    const { data: pendingRequest, error: fetchError } = await supabase
      .from("pending_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !pendingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // 4. Verify the user is the receiver of the request
    if (pendingRequest.receiver_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to handle this request" },
        { status: 403 }
      );
    }

    // 5. Update request status
    const { error: updateError } = await supabase
      .from("pending_requests")
      .update({ status: action === "accept" ? "accepted" : "rejected" })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update request status" },
        { status: 500 }
      );
    }

    // 6. If accepted, create a match
    if (action === "accept") {
      // Ensure consistent order for user1_id and user2_id
      const user1 =
        pendingRequest.sender_id < pendingRequest.receiver_id
          ? pendingRequest.sender_id
          : pendingRequest.receiver_id;
      const user2 =
        pendingRequest.sender_id > pendingRequest.receiver_id
          ? pendingRequest.sender_id
          : pendingRequest.receiver_id;

      // Calculate a project end date 7 days from now
      const projectEndDate = new Date();
      projectEndDate.setDate(projectEndDate.getDate() + 7);

      const { error: matchError } = await supabase.from("matches").insert({
        user1_id: user1,
        user2_id: user2,
        status: "active",
        created_at: new Date().toISOString(),
        project_end_date: projectEndDate.toISOString(),
        stake_status_user1: false,
        stake_status_user2: false,
        is_chat_enabled: false,
        project_submitted_user1: false,
        project_submitted_user2: false,
        stake_amount: 10,
      });

      if (matchError) {
        console.error("Error creating match:", matchError);
        // Don't return error here, as the request was still processed
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in /api/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get pending requests for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get Authenticated User
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Authenticated user:", user.id);

    // 2. Get query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get("type"); // "incoming" or "pending"

    if (!type || !["incoming", "pending"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid request type" },
        { status: 400 }
      );
    }

    // Verify user exists in the users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.error("Error verifying user:", userError);
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    console.log("User verified in database:", user.id);

    // 3. Fetch requests based on type
    let query;

    if (type === "incoming") {
      query = supabase
        .from("pending_requests")
        .select(
          `
          id,
          status,
          created_at,
          sender:sender_id (
            id,
            name,
            bio,
            skills
          )
        `
        )
        .eq("receiver_id", user.id)
        .eq("status", "pending");
    } else {
      query = supabase
        .from("pending_requests")
        .select(
          `
          id,
          status,
          created_at,
          receiver:receiver_id (
            id,
            name,
            bio,
            skills
          )
        `
        )
        .eq("sender_id", user.id)
        .eq("status", "pending");
    }

    console.log("Executing query for", type, "requests for user", user.id);
    const { data: requests, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching requests:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch requests", details: fetchError.message },
        { status: 500 }
      );
    }

    console.log(`Fetched ${requests?.length || 0} ${type} requests:`, requests);
    return NextResponse.json(requests || []);
  } catch (error) {
    console.error("Error in /api/requests GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
