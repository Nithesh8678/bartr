import { redirect } from "next/navigation";
import Link from "next/link";

import { stripe } from "../../lib/stripe";

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
    metadata,
  } = checkoutSession;

  // Get the credits amount from metadata
  const creditsAmount = metadata?.credits || "0";

  if (status === "open") {
    return redirect("/");
  }

  if (status === "complete") {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 flex justify-center">
            <div className="bg-green-100 rounded-full p-3">
              <svg
                className="h-12 w-12 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Purchase Successful!
          </h1>

          <p className="text-lg font-semibold text-green-600 mb-6">
            {creditsAmount} Credits have been added to your account
          </p>

          <p className="text-gray-600 mb-6">
            We've sent a confirmation email to{" "}
            <span className="font-medium">{customerEmail}</span>. If you have
            any questions, please contact our support team.
          </p>

          <div className="flex justify-center space-x-4">
            <Link
              href="/credits-store"
              className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-6 py-2 rounded-md font-medium"
            >
              Back to Store
            </Link>
            <Link
              href="/"
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
