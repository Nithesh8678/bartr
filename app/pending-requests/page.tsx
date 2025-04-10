import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PendingRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // TODO: Fetch pending friend requests from your database
  const pendingRequests = [
    {
      id: "1",
      receiverName: "Jane Smith",
      receiverId: "user_456",
      timestamp: "2024-04-10T10:00:00Z",
      status: "pending",
    },
    // Add more mock data or fetch from your database
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Pending Friend Requests</h1>
      
      {pendingRequests.length === 0 ? (
        <p className="text-gray-500">No pending friend requests</p>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle>{request.receiverName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Sent on {new Date(request.timestamp).toLocaleDateString()}
                  </p>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    request.status === "pending" 
                      ? "bg-yellow-100 text-yellow-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 