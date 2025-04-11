"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { getWalletBalance } from "@/lib/services/wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostgrestError } from "@supabase/supabase-js";

interface WalletDisplayProps {
  userId: string;
}

interface WalletPayload {
  new: {
    balance: number;
  };
}

export default function WalletDisplay({ userId }: WalletDisplayProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { success, balance, error } = await getWalletBalance(userId);
        if (success && balance !== undefined) {
          setBalance(balance);
        } else {
          setError(
            (error as PostgrestError)?.message || "Failed to fetch balance"
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Subscribe to wallet changes
    const subscription = supabase
      .channel(`wallet_changes_${userId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${userId}`,
        },
        (payload: WalletPayload) => {
          if (payload.new) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">₹{balance?.toFixed(2) || "0.00"}</p>
      </CardContent>
    </Card>
  );
}
