-- Drop existing tables if they exist
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS swipes;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  location TEXT,
  timezone TEXT,
  reputation_score INTEGER DEFAULT 0,
  successful_tasks INTEGER DEFAULT 0,
  unsuccessful_tasks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- Create skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT
);

-- Create user_skills junction table
CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  skill_level INTEGER,
  is_offering BOOLEAN NOT NULL,
  UNIQUE(user_id, skill_id, is_offering)
);

-- Create swipes table
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID REFERENCES users(id) ON DELETE CASCADE,
  swiped_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('like', 'skip')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(swiper_id, swiped_user_id) -- Prevent duplicate swipes by the same user on the same profile
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Optional: Add task_id if matches are task-specific
  -- task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Ensure user1_id < user2_id to prevent duplicate matches in reverse order
  CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view any user profile" 
  ON users FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create policies for skills table
CREATE POLICY "Anyone can view skills" 
  ON skills FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert skills" 
  ON skills FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Create policies for user_skills table
CREATE POLICY "Users can view any user_skills" 
  ON user_skills FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own user_skills" 
  ON user_skills FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own user_skills" 
  ON user_skills FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own user_skills" 
  ON user_skills FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for swipes table
CREATE POLICY "Users can insert their own swipes" 
  ON swipes FOR INSERT 
  WITH CHECK (auth.uid() = swiper_id);

-- Allow users to SELECT swipes needed to check for matches (the other user's like on them)
-- Or SELECT their own past swipes (optional, could be useful)
CREATE POLICY "Users can view relevant swipes for matching" 
  ON swipes FOR SELECT 
  USING (
    -- Allow seeing swipes *made by others* ON the current user
    swiped_user_id = auth.uid() 
    OR
    -- Allow seeing swipes *made by* the current user
    swiper_id = auth.uid()
  );
  
-- Policies for matches table
CREATE POLICY "Users can view matches they are part of" 
  ON matches FOR SELECT 
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow authenticated users to insert matches *if* they are one of the participants
-- This check is primarily handled by API logic, but belt-and-suspenders approach
CREATE POLICY "Authenticated users can insert matches they participate in" 
  ON matches FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' AND (auth.uid() = user1_id OR auth.uid() = user2_id));

-- Drop the previous potentially less specific insert policy
DROP POLICY IF EXISTS "Authenticated users can insert matches (if logic handled in API/function)" ON matches;

-- Add some sample skills
INSERT INTO skills (name, category) VALUES 
('JavaScript', 'Programming'),
('Python', 'Programming'),
('UI Design', 'Design'),
('Graphic Design', 'Design'),
('Marketing', 'Business'),
('Content Writing', 'Communication'),
('Data Analysis', 'Data'),
('Photography', 'Creative');

-- Drop the old restrictive select policy if it exists
DROP POLICY IF EXISTS "Users can view their own swipes" ON swipes; 