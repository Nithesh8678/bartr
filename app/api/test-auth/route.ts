import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        {
          authenticated: false,
          error: authError?.message || "Not authenticated",
        },
        { status: 401 }
      );
    }

    // 2. Check if user exists in users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.error("User not found in database:", userError);
      return NextResponse.json(
        {
          authenticated: true,
          userExists: false,
          userId: user.id,
          error: userError?.message || "User not found in database",
        },
        { status: 404 }
      );
    }

    // 3. Check if user has any pending requests
    const { data: pendingRequests, error: requestsError } = await supabase
      .from("pending_requests")
      .select("id, status")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    return NextResponse.json({
      authenticated: true,
      userExists: true,
      userId: user.id,
      userName: userData.name,
      pendingRequestsCount: pendingRequests?.length || 0,
      pendingRequestsError: requestsError?.message || null,
    });
  } catch (error) {
    console.error("Error in test-auth:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
