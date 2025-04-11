-- Create a function to handle accepting a request and creating a match in a single transaction
CREATE OR REPLACE FUNCTION accept_request_and_create_match(
  p_request_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the pending request status to 'accepted'
  UPDATE pending_requests
  SET status = 'accepted'
  WHERE id = p_request_id
  AND status = 'pending';
  
  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Insert a new match
  -- Note: The check constraint likely requires user1_id to be less than user2_id
  -- or some other ordering to prevent duplicate matches
  INSERT INTO matches (
    user1_id,
    user2_id,
    status,
    created_at
  )
  VALUES (
    -- Ensure user1_id is always less than user2_id to satisfy the check constraint
    LEAST(p_sender_id, p_receiver_id),
    GREATEST(p_sender_id, p_receiver_id),
    'active',
    NOW()
  );
  
  -- If we get here, both operations succeeded
  RETURN;
END;
$$; 