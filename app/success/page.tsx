import { redirect } from "next/navigation";
import { stripe } from "../../lib/stripe";
import { createClient } from "@/app/utils/supabase/server";
import { updateWalletBalance } from "@/lib/services/wallet";

export default async function Success({
  searchParams,
}: {
  searchParams: { session_id: string };
}) {
  const { session_id } = searchParams;

  if (!session_id)
    throw new Error("Please provide a valid session_id (`cs_test_...`)");

  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["line_items", "payment_intent"],
  });

  if (!checkoutSession.customer_details?.email) {
    throw new Error("No customer email found");
  }

  const {
    status,
    customer_details: { email: customerEmail },
    amount_total,
    metadata,
  } = checkoutSession;

  // Get the credits amount from metadata if available
  const creditsAmount = metadata?.credits || "0";

  if (status === "open") {
    return redirect("/");
  }

  if (status === "complete") {
    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Add the amount to the user's wallet (convert from paise to rupees)
    const amount = amount_total ? amount_total / 100 : 0;
    const { success, error } = await updateWalletBalance(user.id, amount);

    if (!success) {
      console.error("Error updating wallet:", error);
      throw new Error("Failed to update wallet balance");
    }

    return (
      <section
        id="success"
        className="flex flex-col items-center justify-center min-h-screen p-4"
      >
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-4">
            We appreciate your business! A confirmation email will be sent to{" "}
            {customerEmail}.
          </p>
          <p className="text-gray-600 mb-4">
            ₹{amount.toFixed(2)} has been added to your wallet balance.
          </p>
          <p className="text-sm text-gray-500">
            If you have any questions, please email{" "}
            <a
              href="mailto:orders@example.com"
              className="text-blue-600 hover:underline"
            >
              orders@example.com
            </a>
          </p>
        </div>
      </section>
    );
  }
}
