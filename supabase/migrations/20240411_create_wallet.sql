-- Drop the table if it exists to ensure a clean slate
DROP TABLE IF EXISTS wallets;

-- Create wallet table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Add RLS policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy for viewing wallet (users can only view their own wallet)
CREATE POLICY "Users can view their own wallet"
ON wallets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for updating wallet (users can only update their own wallet)
CREATE POLICY "Users can update their own wallet"
ON wallets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for inserting wallet (users can only insert their own wallet)
CREATE POLICY "Users can insert their own wallet"
ON wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id); 