"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebar } from "../context/SidebarContext";
import IncomingRequestsClient from "../incoming-requests/IncomingRequestsClient";
import PendingRequestsClient from "../pending-requests/PendingRequestsClient";
import { motion, AnimatePresence } from "framer-motion";

interface IncomingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_email: string;
  match_id?: string;
}

interface OutgoingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  receiver_email: string;
  match_id?: string;
}

export default function RequestsSidebar() {
  const { isRequestsSidebarOpen, closeRequestsSidebar } = useSidebar();
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>(
    []
  );
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndRequests = async () => {
      setLoading(true);
      const supabase = createClient();

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setUser(userData.user);

      // Fetch incoming requests
      const { data: incomingData } = await supabase
        .from("pending_requests")
        .select("id, sender_id, receiver_id, status")
        .eq("receiver_id", userData.user.id)
        .eq("status", "pending");

      // Fetch senders info for incoming requests
      if (incomingData && incomingData.length > 0) {
        const senderIds = incomingData.map((req) => req.sender_id);
        const { data: sendersData } = await supabase
          .from("users")
          .select("id, email")
          .in("id", senderIds);

        // Create map of sender emails
        const senderEmailMap = new Map();
        sendersData?.forEach((user) => {
          senderEmailMap.set(user.id, user.email);
        });

        // Map incoming requests with sender emails
        const mappedIncoming = incomingData.map((req) => ({
          id: req.id,
          sender_id: req.sender_id,
          receiver_id: req.receiver_id,
          status: req.status,
          sender_email: senderEmailMap.get(req.sender_id) || "Unknown",
        }));

        setIncomingRequests(mappedIncoming);
      }

      // Fetch outgoing requests
      const { data: outgoingData } = await supabase
        .from("pending_requests")
        .select("id, sender_id, receiver_id, status")
        .eq("sender_id", userData.user.id);

      // Fetch receivers info for outgoing requests
      if (outgoingData && outgoingData.length > 0) {
        const receiverIds = outgoingData.map((req) => req.receiver_id);
        const { data: receiversData } = await supabase
          .from("users")
          .select("id, email")
          .in("id", receiverIds);

        // Create map of receiver emails
        const receiverEmailMap = new Map();
        receiversData?.forEach((user) => {
          receiverEmailMap.set(user.id, user.email);
        });

        // Map outgoing requests with receiver emails
        const mappedOutgoing = outgoingData.map((req) => ({
          id: req.id,
          sender_id: req.sender_id,
          receiver_id: req.receiver_id,
          status: req.status,
          receiver_email: receiverEmailMap.get(req.receiver_id) || "Unknown",
        }));

        setOutgoingRequests(mappedOutgoing);
      }

      setLoading(false);
    };

    if (isRequestsSidebarOpen) {
      fetchUserAndRequests();
    }
  }, [isRequestsSidebarOpen]);

  // Set up real-time subscription for updates
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const subscription = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Refetch when there are changes to user's requests
          if (isRequestsSidebarOpen) {
            const fetchUserAndRequests = async () => {
              // Same fetch logic as above
              // This is duplicated for simplicity, in a real app you might extract this to a function
              setLoading(true);
              const supabase = createClient();

              // Fetch incoming requests
              const { data: incomingData } = await supabase
                .from("pending_requests")
                .select("id, sender_id, receiver_id, status")
                .eq("receiver_id", user.id)
                .eq("status", "pending");

              // Fetch senders info for incoming requests
              if (incomingData && incomingData.length > 0) {
                const senderIds = incomingData.map((req) => req.sender_id);
                const { data: sendersData } = await supabase
                  .from("users")
                  .select("id, email")
                  .in("id", senderIds);

                // Create map of sender emails
                const senderEmailMap = new Map();
                sendersData?.forEach((user) => {
                  senderEmailMap.set(user.id, user.email);
                });

                // Map incoming requests with sender emails
                const mappedIncoming = incomingData.map((req) => ({
                  id: req.id,
                  sender_id: req.sender_id,
                  receiver_id: req.receiver_id,
                  status: req.status,
                  sender_email: senderEmailMap.get(req.sender_id) || "Unknown",
                }));

                setIncomingRequests(mappedIncoming);
              } else {
                setIncomingRequests([]);
              }

              // Fetch outgoing requests
              const { data: outgoingData } = await supabase
                .from("pending_requests")
                .select("id, sender_id, receiver_id, status")
                .eq("sender_id", user.id);

              // Fetch receivers info for outgoing requests
              if (outgoingData && outgoingData.length > 0) {
                const receiverIds = outgoingData.map((req) => req.receiver_id);
                const { data: receiversData } = await supabase
                  .from("users")
                  .select("id, email")
                  .in("id", receiverIds);

                // Create map of receiver emails
                const receiverEmailMap = new Map();
                receiversData?.forEach((user) => {
                  receiverEmailMap.set(user.id, user.email);
                });

                // Map outgoing requests with receiver emails
                const mappedOutgoing = outgoingData.map((req) => ({
                  id: req.id,
                  sender_id: req.sender_id,
                  receiver_id: req.receiver_id,
                  status: req.status,
                  receiver_email:
                    receiverEmailMap.get(req.receiver_id) || "Unknown",
                }));

                setOutgoingRequests(mappedOutgoing);
              } else {
                setOutgoingRequests([]);
              }

              setLoading(false);
            };

            fetchUserAndRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, isRequestsSidebarOpen]);

  return (
    <AnimatePresence>
      {isRequestsSidebarOpen && (
        <>
          {/* Overlay with animation */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeRequestsSidebar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Sidebar with animation */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-lg z-50 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <div className="p-4 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#242FFF] ">Requests</h2>
              <button
                onClick={closeRequestsSidebar}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} color="#242FFF" />
              </button>
            </div>

            <div className="p-4">
              <Tabs
                defaultValue="incoming"
                className="w-full"
                onValueChange={setActiveTab}
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger
                    value="incoming"
                    className="data-[state=active]:bg-[#242FFF]/10 data-[state=active]:text-[#242FFF] transition-colors font-medium text-sm"
                  >
                    Incoming
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="data-[state=active]:bg-[#242FFF]/10 data-[state=active]:text-[#242FFF] transition-colors font-medium text-sm"
                  >
                    Pending
                  </TabsTrigger>
                </TabsList>

                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <motion.div
                      className="rounded-full h-8 w-8 border-t-2 border-b-2 border-[#242FFF]"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <TabsContent value="incoming" className="w-full mt-0">
                      <IncomingRequestsClient
                        initialRequests={incomingRequests}
                      />
                    </TabsContent>

                    <TabsContent value="pending" className="w-full mt-0">
                      <PendingRequestsClient
                        initialRequests={outgoingRequests}
                      />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
