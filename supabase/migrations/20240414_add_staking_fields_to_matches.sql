-- Add staking fields to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS stake_status_user1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stake_status_user2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_chat_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS project_submitted_user1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS project_submitted_user2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stake_amount INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS project_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS work_description TEXT;

-- Add RLS policies for matches table to secure staking operations
CREATE POLICY "Users can only update their own stake status"
ON matches
FOR UPDATE
USING (
  (auth.uid() = user1_id AND NOT stake_status_user1) OR
  (auth.uid() = user2_id AND NOT stake_status_user2)
)
WITH CHECK (
  (auth.uid() = user1_id AND old.stake_status_user1 = FALSE AND new.stake_status_user1 = TRUE) OR
  (auth.uid() = user2_id AND old.stake_status_user2 = FALSE AND new.stake_status_user2 = TRUE)
);

-- Add policy for project submission
CREATE POLICY "Users can only update their own project submission status"
ON matches
FOR UPDATE
USING (
  (auth.uid() = user1_id AND NOT project_submitted_user1) OR
  (auth.uid() = user2_id AND NOT project_submitted_user2)
)
WITH CHECK (
  (auth.uid() = user1_id AND old.project_submitted_user1 = FALSE AND new.project_submitted_user1 = TRUE) OR
  (auth.uid() = user2_id AND old.project_submitted_user2 = FALSE AND new.project_submitted_user2 = TRUE)
); 