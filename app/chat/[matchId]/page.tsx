"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Send,
  ArrowLeft,
  ChevronRight,
  Paperclip,
  File,
} from "lucide-react";
import { User } from "@supabase/supabase-js"; // Import User type
import Link from "next/link";
import { Toaster } from "sonner"; // Import Toaster for potential error messages

// Define Message structure
interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  file_url?: string;
  file_name?: string;
}

// Define structure for the other user in the chat
interface ChatPartner {
  id: string;
  name: string;
}

// Define structure for match data including staking fields
interface MatchData {
  id: string;
  user1_id: string;
  user2_id: string;
  stake_status_user1: boolean;
  stake_status_user2: boolean;
  is_chat_enabled: boolean;
  project_submitted_user1: boolean;
  project_submitted_user2: boolean;
  project_end_date: string | null;
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
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Ref for scrolling
  const sentMessageIds = useRef<Set<string>>(new Set()); // Track sent message IDs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch initial data and subscribe
  useEffect(() => {
    let subscription: any = null;
    let matchSubscription: any = null;

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
          .select("*")
          .eq("id", matchId)
          .single();

        if (matchError)
          throw new Error(`Match not found or DB error: ${matchError.message}`);
        if (!matchData) throw new Error("Match data could not be retrieved.");
        console.log("Match Data:", matchData);

        setMatchData(matchData);

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
          .order("timestamp", { ascending: true });

        if (messagesError)
          throw new Error(`Failed to fetch messages: ${messagesError.message}`);
        setMessages(initialMessages || []);
        console.log(
          `Fetched ${initialMessages?.length || 0} initial messages.`
        );

        // 5. Setup Real-time Subscription for messages
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

              // Skip if this is a message we just sent (tracked in sentMessageIds)
              if (sentMessageIds.current.has(newMessageReceived.id)) {
                console.log(
                  "Skipping already displayed message:",
                  newMessageReceived.id
                );
                return;
              }

              // Add message only if it doesn't already exist (prevents duplicates)
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

        // 6. Setup Real-time Subscription for match updates
        matchSubscription = supabase
          .channel(`match_updates_${matchId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "matches",
              filter: `id=eq.${matchId}`,
            },
            (payload) => {
              console.log("Match update received:", payload);
              setMatchData(payload.new as MatchData);
            }
          )
          .subscribe();
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
      if (matchSubscription) {
        supabase
          .removeChannel(matchSubscription)
          .catch((err) => console.error("Error removing match channel:", err));
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
    setNewMessage(""); // Clear input immediately to prevent double-sends

    try {
      const currentTime = new Date().toISOString(); // Get current client time

      // Send message to database with current time
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            match_id: matchId,
            sender_id: currentUser.id,
            message: messageContent,
            timestamp: currentTime, // Use current time instead of server time
          },
        ])
        .select();

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }

      // We'll let the subscription handle adding the message to the UI
      // Just track the ID to prevent duplication
      if (data && data.length > 0) {
        sentMessageIds.current.add(data[0].id);
      }

      console.log("Message sent successfully", data);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !currentUser || !matchId || isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      // Upload the file to storage
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `files/${matchId}/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get a public URL for the file
      const { data: urlData } = await supabase.storage
        .from("chat-files")
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to get file URL");
      }

      // Save message with file reference
      const currentTime = new Date().toISOString();
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            match_id: matchId,
            sender_id: currentUser.id,
            message: `Sent a file: ${selectedFile.name}`,
            timestamp: currentTime,
            file_url: urlData.publicUrl,
            file_name: selectedFile.name,
          },
        ])
        .select();

      if (error) {
        throw new Error(`Failed to save file message: ${error.message}`);
      }

      // Track the ID to prevent duplication
      if (data && data.length > 0) {
        sentMessageIds.current.add(data[0].id);
      }

      console.log("File uploaded successfully", data);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      scrollToBottom();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-red-50 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
        <Link
          href="/matches"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Matches
        </Link>
      </div>
    );
  }

  if (!matchData || !chatPartner) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-yellow-50 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-yellow-700 mb-2">
          Chat Not Available
        </h2>
        <p className="text-yellow-600">
          The requested chat could not be loaded. It may have been removed or
          you don't have access.
        </p>
        <Link
          href="/matches"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Matches
        </Link>
      </div>
    );
  }

  const isUser1 = currentUser?.id === matchData.user1_id;
  const isChatEnabled = matchData.is_chat_enabled;

  return (
    <div className="max-w-4xl mx-auto p-4 pt-20">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Link
            href="/matches"
            className="text-gray-600 hover:text-gray-900 mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold">
            Chat with {chatPartner.name}
          </h1>
        </div>
        <Button
          onClick={() => router.push("/Dashboard")}
          variant="outline"
          className="flex items-center gap-1"
        >
          View Project Dashboard <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isChatEnabled ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <h2 className="text-lg font-medium text-yellow-800 mb-2">
            Chat not yet available
          </h2>
          <p className="text-yellow-700 mb-4">
            Both users need to stake credits to enable chat.
          </p>
          <Button
            onClick={() => router.push("/matches")}
            variant="outline"
            className="mx-auto"
          >
            Back to Matches
          </Button>
        </div>
      ) : (
        <>
          {/* Chat Messages */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 h-[60vh] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>No messages yet</p>
                <p className="text-sm mt-1">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isCurrentUser = message.sender_id === currentUser?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-lg ${
                          isCurrentUser
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1">
                          {isCurrentUser ? "You" : chatPartner?.name}
                        </p>
                        {message.file_url ? (
                          <div className="mb-2">
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline"
                            >
                              <File className="h-4 w-4" />
                              <span className="text-sm overflow-hidden text-ellipsis">
                                {message.file_name || "File"}
                              </span>
                            </a>
                          </div>
                        ) : null}
                        <p>{message.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-blue-100" : "text-gray-500"
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="mt-4 flex items-center gap-2"
          >
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow"
              disabled={isSending || isUploading}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="px-3"
              disabled={isUploading || isSending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            {selectedFile && (
              <Button
                type="button"
                onClick={handleFileUpload}
                disabled={isUploading}
                className={`px-3 ${isUploading ? "opacity-70" : ""}`}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs truncate max-w-[100px]">
                    {selectedFile.name}
                  </span>
                )}
              </Button>
            )}
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending || isUploading}
              className={isSending ? "opacity-70" : ""}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-1">Send</span>
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
