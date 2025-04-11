import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { createClient } from "@/app/utils/supabase/client";

interface RequestCardProps {
  request: {
    id: string;
    sender: {
      id: string;
      name: string;
      bio?: string;
      skills?: string[];
    };
  };
  onAccept: () => void;
}

export function RequestCard({ request, onAccept }: RequestCardProps) {
  const handleAccept = async () => {
    try {
      const supabase = createClient();

      // Update the request status
      const { error: updateError } = await supabase
        .from("pending_requests")
        .update({ status: "accepted" })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Create a new match
      const { error: matchError } = await supabase.from("matches").insert([
        {
          user1_id: request.sender.id,
          user2_id: (await supabase.auth.getUser()).data.user?.id,
          status: "active",
        },
      ]);

      if (matchError) throw matchError;

      alert("Request accepted successfully!");
      onAccept();
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{request.sender.name}</CardTitle>
        {request.sender.bio && (
          <CardDescription>{request.sender.bio}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {request.sender.skills && request.sender.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {request.sender.skills.map((skill, index) => (
              <span
                key={index}
                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAccept} className="w-full">
          Accept Request
        </Button>
      </CardFooter>
    </Card>
  );
}
