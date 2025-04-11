-- Create a function to handle the staking of credits
CREATE OR REPLACE FUNCTION stake_credits(
  p_match_id UUID,
  p_user_id UUID,
  p_stake_amount INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_credits INTEGER;
  v_is_user1 BOOLEAN;
  v_other_user_stake BOOLEAN;
  v_stake_field TEXT;
  v_partner_stake_field TEXT;
BEGIN
  -- Check if the user has enough credits
  SELECT credits INTO v_user_credits FROM users WHERE id = p_user_id;
  
  IF v_user_credits < p_stake_amount THEN
    RAISE EXCEPTION 'Not enough credits to stake';
  END IF;
  
  -- Determine if the user is user1 or user2
  SELECT (user1_id = p_user_id) INTO v_is_user1 FROM matches WHERE id = p_match_id;
  
  IF v_is_user1 THEN
    v_stake_field := 'stake_status_user1';
    v_partner_stake_field := 'stake_status_user2';
  ELSE
    v_stake_field := 'stake_status_user2';
    v_partner_stake_field := 'stake_status_user1';
  END IF;
  
  -- Get the other user's stake status
  EXECUTE format('SELECT %I FROM matches WHERE id = $1', v_partner_stake_field)
  INTO v_other_user_stake
  USING p_match_id;
  
  -- Update the stake status
  EXECUTE format('
    UPDATE matches 
    SET %I = true,
        is_chat_enabled = CASE WHEN %I = true THEN true ELSE is_chat_enabled END
    WHERE id = $1', 
    v_stake_field, v_partner_stake_field)
  USING p_match_id;
  
  -- Deduct credits from the user
  UPDATE users SET credits = credits - p_stake_amount WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Create a function to handle the project submission
CREATE OR REPLACE FUNCTION submit_project(
  p_match_id UUID,
  p_user_id UUID,
  p_submission_content TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_user1 BOOLEAN;
  v_submission_field TEXT;
  v_partner_submission_field TEXT;
BEGIN
  -- Determine if the user is user1 or user2
  SELECT (user1_id = p_user_id) INTO v_is_user1 FROM matches WHERE id = p_match_id;
  
  IF v_is_user1 THEN
    v_submission_field := 'project_submitted_user1';
    v_partner_submission_field := 'project_submitted_user2';
  ELSE
    v_submission_field := 'project_submitted_user2';
    v_partner_submission_field := 'project_submitted_user1';
  END IF;
  
  -- Update the submission status
  EXECUTE format('
    UPDATE matches 
    SET %I = true,
        work_description = $2
    WHERE id = $1', 
    v_submission_field)
  USING p_match_id, p_submission_content;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Create a function to confirm project completion
CREATE OR REPLACE FUNCTION confirm_completion(
  p_match_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_stake_amount INTEGER;
  v_partner_id UUID;
BEGIN
  -- Get match details
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if both users have submitted their projects
  IF NOT (v_match.project_submitted_user1 AND v_match.project_submitted_user2) THEN
    RAISE EXCEPTION 'Both users must submit their projects before confirming completion';
  END IF;
  
  -- Determine stake amount and partner ID
  v_stake_amount := v_match.stake_amount;
  IF v_match.user1_id = p_user_id THEN
    v_partner_id := v_match.user2_id;
  ELSE
    v_partner_id := v_match.user1_id;
  END IF;
  
  -- Refund credits to both users
  UPDATE users SET credits = credits + v_stake_amount WHERE id = p_user_id;
  UPDATE users SET credits = credits + v_stake_amount WHERE id = v_partner_id;
  
  -- Add 10 extra credits as reward to both users for completing the barter
  UPDATE users SET credits = credits + 10 WHERE id = p_user_id;
  UPDATE users SET credits = credits + 10 WHERE id = v_partner_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Create a function to handle expired matches
CREATE OR REPLACE FUNCTION handle_expired_match(
  p_match_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_stake_amount INTEGER;
BEGIN
  -- Get match details
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  v_stake_amount := v_match.stake_amount;
  
  -- Refund to user1 if they submitted but user2 didn't
  IF v_match.project_submitted_user1 AND NOT v_match.project_submitted_user2 THEN
    UPDATE users SET credits = credits + v_stake_amount WHERE id = v_match.user1_id;
  END IF;
  
  -- Refund to user2 if they submitted but user1 didn't
  IF v_match.project_submitted_user2 AND NOT v_match.project_submitted_user1 THEN
    UPDATE users SET credits = credits + v_stake_amount WHERE id = v_match.user2_id;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$; 