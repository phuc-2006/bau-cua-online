-- Add REPLICA IDENTITY FULL for rooms table to enable full payload on UPDATE events
ALTER TABLE public.rooms REPLICA IDENTITY FULL;