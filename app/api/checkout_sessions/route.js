import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "../../../lib/stripe";

export async function POST(request) {
  try {
    const headersList = headers();
    const origin = headersList.get("origin");

    // Get form data with the selected package
    const formData = await request.formData();
    const priceId = formData.get("priceId");
    const credits = formData.get("credits");

    if (!priceId) {
      return NextResponse.json(
        { error: "Please select a credit package" },
        { status: 400 }
      );
    }

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        credits: credits || "",
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/credits-store?canceled=true`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
