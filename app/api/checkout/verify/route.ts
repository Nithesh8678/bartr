import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { createClient } from "@/app/utils/supabase/server";
import { updateWalletBalance } from "@/lib/services/wallet";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return NextResponse.json(
        { error: "Please provide a valid session_id" },
        { status: 400 }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(
      session_id,
      {
        expand: ["line_items", "payment_intent"],
      }
    );

    if (!checkoutSession.customer_details?.email) {
      return NextResponse.json(
        { error: "No customer email found" },
        { status: 400 }
      );
    }

    const {
      status,
      customer_details: { email: customerEmail },
      amount_total,
      metadata,
    } = checkoutSession;

    if (status === "open") {
      return NextResponse.json({ status: "open" });
    }

    if (status === "complete") {
      // Get the authenticated user
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "User not authenticated" },
          { status: 401 }
        );
      }

      // Add the amount to the user's wallet (convert from paise to rupees)
      const amount = amount_total ? amount_total / 100 : 0;
      const { success, error } = await updateWalletBalance(
        user.id,
        amount / 10
      );

      if (!success) {
        console.error("Error updating wallet:", error);
        return NextResponse.json(
          { error: "Failed to update wallet balance" },
          { status: 500 }
        );
      }

      // Calculate credits based on payment amount (₹10 = 1 credit)
      const creditsEarned = Math.floor(amount / 10);

      if (creditsEarned > 0) {
        // Get current user credits
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("credits")
          .eq("id", user.id)
          .single();

        if (userError) {
          console.error("Error fetching user credits:", userError);
        } else {
          // Calculate new credits total (default to 0 if credits is null)
          const currentCredits = userData?.credits || 0;
          const newCredits = currentCredits + creditsEarned;

          // Update user credits
          const { error: updateError } = await supabase
            .from("users")
            .update({ credits: newCredits })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error updating user credits:", updateError);
          }
        }
      }

      return NextResponse.json({
        status: "complete",
        customerEmail,
        amount,
        creditsEarned,
      });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error processing checkout verification:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
