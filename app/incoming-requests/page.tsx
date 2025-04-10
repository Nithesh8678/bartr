import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IncomingRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // TODO: Fetch incoming friend requests from your database
  const incomingRequests = [
    {
      id: "1",
      senderName: "John Doe",
      senderId: "user_123",
      timestamp: "2024-04-10T12:00:00Z",
    },
    // Add more mock data or fetch from your database
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Incoming Friend Requests</h1>
      
      {incomingRequests.length === 0 ? (
        <p className="text-gray-500">No incoming friend requests</p>
      ) : (
        <div className="grid gap-4">
          {incomingRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle>{request.senderName}</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Sent on {new Date(request.timestamp).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-red-500">
                    Reject
                  </Button>
                  <Button>Accept</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 