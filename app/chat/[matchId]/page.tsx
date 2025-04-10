"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import { User } from "@supabase/supabase-js"; // Import User type
import Link from "next/link";
import { Toaster } from "sonner"; // Import Toaster for potential error messages

// Define Message structure
interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Define structure for the other user in the chat
interface ChatPartner {
  id: string;
  name: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Ref for scrolling

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch initial data and subscribe
  useEffect(() => {
    let subscription: any = null;

    const setupChat = async () => {
      setIsLoading(true);
      setError(null);

      // 1. Get Current User
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Auth Error:", authError);
        setError("Authentication failed. Please log in.");
        setIsLoading(false);
        router.push("/login"); // Redirect if not logged in
        return;
      }
      setCurrentUser(user);
      console.log("Current User ID:", user.id);

      if (!matchId) {
        setError("Match ID is missing from URL.");
        setIsLoading(false);
        return;
      }
      console.log("Match ID:", matchId);

      try {
        // 2. Fetch Match Details & Verify User Participation
        console.log("Fetching match details...");
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select("user1_id, user2_id")
          .eq("id", matchId)
          .single();

        if (matchError)
          throw new Error(`Match not found or DB error: ${matchError.message}`);
        if (!matchData) throw new Error("Match data could not be retrieved.");
        console.log("Match Data:", matchData);

        const { user1_id, user2_id } = matchData;
        if (user.id !== user1_id && user.id !== user2_id) {
          throw new Error("Access Denied: You are not part of this match.");
        }

        const partnerId = user.id === user1_id ? user2_id : user1_id;
        console.log("Partner ID:", partnerId);

        // 3. Fetch Partner Details
        const { data: partnerData, error: partnerError } = await supabase
          .from("users")
          .select("id, name")
          .eq("id", partnerId)
          .single();

        if (partnerError)
          throw new Error(
            `Failed to fetch partner details: ${partnerError.message}`
          );
        if (!partnerData) throw new Error("Chat partner could not be found.");
        setChatPartner(partnerData as ChatPartner);
        console.log("Chat Partner:", partnerData);

        // 4. Fetch Initial Messages
        console.log("Fetching initial messages...");
        const { data: initialMessages, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true });

        if (messagesError)
          throw new Error(`Failed to fetch messages: ${messagesError.message}`);
        setMessages(initialMessages || []);
        console.log(
          `Fetched ${initialMessages?.length || 0} initial messages.`
        );

        // 5. Setup Real-time Subscription
        console.log("Setting up real-time subscription...");
        subscription = supabase
          .channel(`messages_match_${matchId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `match_id=eq.${matchId}`,
            },
            (payload) => {
              console.log("New message received via subscription:", payload);
              const newMessageReceived = payload.new as Message;
              // Add message only if it doesn't already exist (prevents duplicates on send)
              setMessages((currentMessages) => {
                if (
                  !currentMessages.some(
                    (msg) => msg.id === newMessageReceived.id
                  )
                ) {
                  console.log(
                    "Adding new message to state:",
                    newMessageReceived
                  );
                  return [...currentMessages, newMessageReceived];
                }
                console.log(
                  "Duplicate message detected, skipping:",
                  newMessageReceived.id
                );
                return currentMessages;
              });
            }
          )
          .subscribe((status, err) => {
            if (status === "SUBSCRIBED") {
              console.log("Realtime subscription active for match", matchId);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.error("Realtime subscription error:", err);
              setError("Chat connection error. Please refresh.");
            } else {
              console.log("Realtime subscription status:", status);
            }
          });
      } catch (err: any) {
        console.error("Error setting up chat:", err);
        setError(err.message || "Failed to load chat.");
      } finally {
        setIsLoading(false);
      }
    };

    setupChat();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        console.log("Unsubscribing from chat channel");
        supabase
          .removeChannel(subscription)
          .catch((err) => console.error("Error removing channel:", err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, supabase, router]); // Dependencies: Run when matchId changes

  // Scroll to bottom when messages array changes
  useEffect(() => {
    // Delay scroll slightly to allow DOM update
    setTimeout(() => scrollToBottom(), 100);
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageContent = newMessage.trim();

    if (!messageContent || !currentUser || !matchId || isSending) {
      return;
    }

    setIsSending(true);

    const messagePayload = {
      match_id: matchId,
      sender_id: currentUser.id,
      content: messageContent,
    };

    console.log("Sending message:", messagePayload);

    // Insert the message
    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert(messagePayload)
      .select() // Select the inserted row to get its ID
      .single(); // Expecting a single row back

    setIsSending(false);

    if (insertError) {
      console.error("Error sending message:", insertError);
      setError("Failed to send message. Please try again.");
      // Optionally show a toast error here
    } else {
      console.log("Message sent successfully and inserted:", insertedMessage);
      setNewMessage(""); // Clear input field
      setError(null); // Clear previous errors
      // No need to manually add the message here, subscription handles it.
      // However, sometimes adding it manually *then* letting the subscription potentially
      // skip the duplicate can feel faster UI-wise. For simplicity, we rely on subscription.
      scrollToBottom(); // Ensure scroll after sending
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/browse">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Toaster position="top-center" richColors />
      {/* Chat Header */}
      <header className="sticky top-0 z-10 flex items-center p-3 border-b bg-white shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold text-center truncate">
          Chat with {chatPartner?.name || "User"}
        </h1>
        <div className="w-10"></div> {/* Spacer to balance back button */}
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender_id === currentUser?.id
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                message.sender_id === currentUser?.id
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-800 border border-gray-200"
              }`}
            >
              <p className="text-sm break-words">{message.content}</p>
              {/* Optional: Add timestamp - consider locale formatting */}
              {/* <p className={`text-xs mt-1 ${message.sender_id === currentUser?.id ? 'text-blue-100 opacity-80' : 'text-gray-400'} text-right`}>
                 {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
               </p> */}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm pt-10">
            No messages yet. Start the conversation!
          </p>
        )}
        <div ref={messagesEndRef} style={{ height: "1px" }} />{" "}
        {/* Element to scroll to */}
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 flex items-center gap-2 p-3 border-t bg-gray-100"
      >
        <Input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-white"
          disabled={isSending}
          autoComplete="off"
        />
        <Button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          size="icon"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
