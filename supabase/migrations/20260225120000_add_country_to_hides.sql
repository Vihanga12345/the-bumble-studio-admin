-- Add country field to hides table
ALTER TABLE public.hides
  ADD COLUMN IF NOT EXISTS country text;
