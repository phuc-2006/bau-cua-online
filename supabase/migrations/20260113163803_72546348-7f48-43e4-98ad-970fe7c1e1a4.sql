-- Cho phép người chơi trong cùng phòng xem profiles của nhau
CREATE POLICY "Room players can view other players profiles"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.room_players rp1
        JOIN public.room_players rp2 ON rp1.room_id = rp2.room_id
        WHERE rp1.user_id = auth.uid()
          AND rp2.user_id = profiles.user_id
    )
);