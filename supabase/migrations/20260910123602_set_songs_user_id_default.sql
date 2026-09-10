/*
# Set default user_id on songs table

Adds DEFAULT auth.uid() to the songs.user_id column so inserts that omit user_id
still satisfy the INSERT RLS policy.
*/

ALTER TABLE songs ALTER COLUMN user_id SET DEFAULT auth.uid();
