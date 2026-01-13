-- Ensure realtime DELETE events include old row data (room_id, user_id, etc.)
-- This fixes client-side filtering for room_players DELETE events.
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
