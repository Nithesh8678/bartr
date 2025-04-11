-- Create pending_requests table
CREATE TABLE IF NOT EXISTS pending_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sender_id, receiver_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_requests_sender ON pending_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_pending_requests_receiver ON pending_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_pending_requests_status ON pending_requests(status);

-- Add RLS policies
ALTER TABLE pending_requests ENABLE ROW LEVEL SECURITY;

-- Policy for inserting requests (users can only create requests where they are the sender)
CREATE POLICY "Users can create requests where they are the sender"
ON pending_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Policy for viewing requests (users can only view requests where they are either the sender or receiver)
CREATE POLICY "Users can view their own requests"
ON pending_requests FOR SELECT
TO authenticated
USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
);

-- Policy for updating requests (only the receiver can update the status)
CREATE POLICY "Only receivers can update request status"
ON pending_requests FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Policy for deleting requests (users can only delete their own requests)
CREATE POLICY "Users can delete their own requests"
ON pending_requests FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id); 