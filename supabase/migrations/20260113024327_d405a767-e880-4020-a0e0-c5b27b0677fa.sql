-- Create rooms table
CREATE TABLE public.rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    host_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'waiting',
    max_players integer NOT NULL DEFAULT 6,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT valid_status CHECK (status IN ('waiting', 'playing', 'finished'))
);

-- Create room_players table
CREATE TABLE public.room_players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (room_id, user_id)
);

-- Create game_sessions table
CREATE TABLE public.game_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    dice_results jsonb,
    status text NOT NULL DEFAULT 'betting',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    ended_at timestamp with time zone,
    CONSTRAINT valid_session_status CHECK (status IN ('betting', 'rolling', 'revealed', 'settled'))
);

-- Create game_bets table
CREATE TABLE public.game_bets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    animal_type text NOT NULL,
    amount bigint NOT NULL,
    winnings bigint,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT valid_animal CHECK (animal_type IN ('bau', 'cua', 'tom', 'ca', 'ga', 'nai'))
);

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_bets ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is in a room
CREATE OR REPLACE FUNCTION public.is_room_player(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.room_players
        WHERE user_id = _user_id
          AND room_id = _room_id
    )
$$;

-- Create helper function to check if user is room host
CREATE OR REPLACE FUNCTION public.is_room_host(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.rooms
        WHERE id = _room_id
          AND host_id = _user_id
    )
$$;

-- RLS Policies for rooms table
CREATE POLICY "Anyone authenticated can view rooms"
ON public.rooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create rooms"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their room"
ON public.rooms FOR UPDATE
TO authenticated
USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their room"
ON public.rooms FOR DELETE
TO authenticated
USING (auth.uid() = host_id);

-- RLS Policies for room_players table
CREATE POLICY "Anyone authenticated can view room players"
ON public.room_players FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can join rooms"
ON public.room_players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can leave room or host can kick"
ON public.room_players FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id 
    OR public.is_room_host(auth.uid(), room_id)
);

-- RLS Policies for game_sessions table
CREATE POLICY "Room players can view sessions"
ON public.game_sessions FOR SELECT
TO authenticated
USING (public.is_room_player(auth.uid(), room_id));

CREATE POLICY "Host can create sessions"
ON public.game_sessions FOR INSERT
TO authenticated
WITH CHECK (public.is_room_host(auth.uid(), room_id));

CREATE POLICY "Host can update sessions"
ON public.game_sessions FOR UPDATE
TO authenticated
USING (public.is_room_host(auth.uid(), room_id));

-- RLS Policies for game_bets table
CREATE POLICY "Players can view their own bets"
ON public.game_bets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Players can place bets"
ON public.game_bets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add trigger for rooms updated_at
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_bets;