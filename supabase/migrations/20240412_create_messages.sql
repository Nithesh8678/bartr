-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Add RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy for inserting messages (users can only send messages in matches they belong to)
CREATE POLICY "Users can send messages in their matches"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

-- Policy for viewing messages (users can only view messages from matches they belong to)
CREATE POLICY "Users can view messages from their matches"
ON messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
); 