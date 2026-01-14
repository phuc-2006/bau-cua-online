-- Add is_ready column to room_players table for persistent ready status
ALTER TABLE room_players 
ADD COLUMN IF NOT EXISTS is_ready boolean DEFAULT false;

-- Enable realtime for room_players UPDATE events
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE rooms, room_players, game_sessions, profiles;
