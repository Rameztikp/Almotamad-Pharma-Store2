-- Drop indexes first
DROP INDEX IF EXISTS idx_fcm_tokens_token;
DROP INDEX IF EXISTS idx_fcm_tokens_user_id;

-- Drop the table
DROP TABLE IF EXISTS fcm_tokens;
