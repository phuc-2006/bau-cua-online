-- Add UPDATE policy for room_players table
-- This allows players to update their own row (is_ready, total_bet)
CREATE POLICY "Players can update their own row"
ON public.room_players FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
