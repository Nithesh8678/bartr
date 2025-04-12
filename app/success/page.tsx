"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { stripe } from "../../lib/stripe";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { updateWalletBalance } from "@/lib/services/wallet";

export default function Success() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    customerEmail: string;
    amount: number;
    creditsEarned: number;
  } | null>(null);

  useEffect(() => {
    async function processPayment() {
      try {
        const session_id = searchParams.get("session_id");

        if (!session_id) {
          setError("Please provide a valid session_id");
          setIsLoading(false);
          return;
        }

        // Get session from Stripe
        const response = await fetch(
          `/api/checkout/verify?session_id=${session_id}`,
          {
            method: "GET",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to verify payment");
        }

        const data = await response.json();

        if (data.status !== "complete") {
          router.push("/");
          return;
        }

        setPaymentData({
          customerEmail: data.customerEmail,
          amount: data.amount,
          creditsEarned: data.creditsEarned || 0,
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error processing payment:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setIsLoading(false);
      }
    }

    processPayment();
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
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
        {paymentData && (
          <>
            <p className="text-gray-600 mb-4">
              We appreciate your business! A confirmation email will be sent to{" "}
              {paymentData.customerEmail}.
            </p>
            <p className="text-gray-600 mb-4">
              ₹{paymentData.amount.toFixed(2)} has been added to your wallet
              balance.
            </p>
            {paymentData.creditsEarned > 0 && (
              <p className="text-gray-600 mb-4">
                You've earned {paymentData.creditsEarned} credits! (₹10 = 1
                credit)
              </p>
            )}
          </>
        )}
        <p className="text-sm text-gray-500">
          If you have any questions, please email{" "}
          <a
            href="mailto:orders@example.com"
            className="text-blue-600 hover:underline"
          >
            orders@example.com
          </a>
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return Home
        </button>
      </div>
    </section>
  );
}
