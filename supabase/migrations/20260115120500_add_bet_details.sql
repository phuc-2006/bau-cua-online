-- Add bet_details column to track detailed bets per animal for each player
ALTER TABLE room_players 
ADD COLUMN IF NOT EXISTS bet_details jsonb DEFAULT '{}';
