-- Add unique constraint to prevent duplicate player entries
ALTER TABLE public.room_players 
ADD CONSTRAINT room_players_room_user_unique UNIQUE (room_id, user_id);

-- Update existing foreign key to have CASCADE delete
ALTER TABLE public.room_players
DROP CONSTRAINT IF EXISTS room_players_room_id_fkey;

ALTER TABLE public.room_players
ADD CONSTRAINT room_players_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

-- Add indexes for better query performance  
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status_created ON public.rooms(status, created_at DESC);