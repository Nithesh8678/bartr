export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  profile_image_url?: string;
  location?: string;
  timezone?: string;
  availability_schedule?: any;
  reputation_score?: number;
  successful_tasks?: number;
  unsuccessful_tasks?: number;
  created_at?: string;
  last_active_at?: string;
  skills?: string[]; // Skills the user can offer
  skillsRequired?: string[]; // Skills the user is looking for
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  user_id: string; // creator
  status: "open" | "assigned" | "completed" | "cancelled";
  complexity_level?: number;
  estimated_hours?: number;
  deadline?: string;
  created_at: string;
  completed_at?: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  task_id: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  created_at: string;
}
