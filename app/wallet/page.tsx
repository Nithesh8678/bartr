import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import WalletDisplay from "@/app/components/WalletDisplay";
import AddMoneyToWallet from "@/app/components/AddMoneyToWallet";

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Wallet</h1>
        <div className="grid gap-8 md:grid-cols-2">
          <WalletDisplay userId={user.id} />
          <AddMoneyToWallet />
        </div>
      </div>
    </div>
  );
}
