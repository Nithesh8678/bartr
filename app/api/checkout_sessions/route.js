import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "../../../lib/stripe";

export async function POST(request) {
  try {
    const headersList = headers();
    const origin = headersList.get("origin");
    const { amount } = await request.json();

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Wallet Top-up",
              description: `Add ₹${amount} to your wallet`,
            },
            unit_amount: amount * 100, // Convert to paise
          },
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

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
