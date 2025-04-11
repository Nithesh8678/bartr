# Handle Expired Matches - Supabase Edge Function

This is a scheduled Supabase Edge Function that automatically checks for expired matches and handles credit refunds for users who submitted their projects when their partners didn't.

## Setup Instructions

1. Install the Supabase CLI if you haven't already:

   ```bash
   npm install -g supabase
   ```

2. Create the function:

   ```bash
   supabase functions new handle_expired_matches
   ```

3. Replace the function code in `index.ts` with the implementation in this directory

4. Deploy the function to Supabase:

   ```bash
   supabase functions deploy handle_expired_matches
   ```

5. Set up a scheduled job in Supabase to run this function daily:
   ```bash
   supabase scheduled-functions create \
     --name "Check expired matches" \
     --schedule "0 0 * * *" \
     --function-name "handle_expired_matches"
   ```

## Function Logic

This function:

1. Finds matches where the project end date has passed
2. Identifies matches where only one user has submitted their project
3. Issues refunds to users who submitted their work
4. Updates match status accordingly

## Security Considerations

This function uses the service role key to ensure it has the necessary permissions to process refunds even when no user is directly authenticated. The service role key should be kept secure and never exposed in client-side code.

## Troubleshooting

If the function fails, check the Supabase logs:

```bash
supabase functions logs handle_expired_matches
```
