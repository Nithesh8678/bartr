"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IncomingRequestsList from "./IncomingRequestsList";
import PendingRequestsList from "./PendingRequestsList";

interface RequestsClientProps {
  userId: string;
}

export default function RequestsClient({ userId }: RequestsClientProps) {
  const [activeTab, setActiveTab] = useState("incoming");
  const router = useRouter();

  return (
    <div className="flex flex-col w-full">
      <h1 className="text-2xl font-bold mb-6">Requests</h1>

      <Tabs
        defaultValue="incoming"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger
            value="incoming"
            className="px-4 py-2 data-[state=active]:bg-[#242FFF]/10 data-[state=active]:text-[#242FFF] rounded-full transition-colors font-medium text-sm"
          >
            Incoming Requests
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="px-4 py-2 data-[state=active]:bg-[#242FFF]/10 data-[state=active]:text-[#242FFF] rounded-full transition-colors font-medium text-sm"
          >
            Pending Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="w-full">
          <IncomingRequestsList userId={userId} />
        </TabsContent>

        <TabsContent value="pending" className="w-full">
          <PendingRequestsList userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
