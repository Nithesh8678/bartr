-- Drop existing tables if they exist
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

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