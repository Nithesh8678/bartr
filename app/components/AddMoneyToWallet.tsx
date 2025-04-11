"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AMOUNT = 100; // Fixed amount of ₹100

export default function AddMoneyToWallet() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMoney = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: AMOUNT }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleAddMoney}
        disabled={isLoading}
        className="w-full p-4 text-lg font-semibold bg-[#2A0EFF] hover:bg-[#1A0EDF] text-white transition-all duration-200"
      >
        Add ₹{AMOUNT} to Wallet
      </Button>
    </div>
  );
}
