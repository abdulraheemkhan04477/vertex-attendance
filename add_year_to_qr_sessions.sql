-- Add 'year' column to qr_sessions table
-- This is required because the session identification logic was updated to use Year|Branch|Semester.

ALTER TABLE public.qr_sessions
ADD COLUMN IF NOT EXISTS year text;

-- (Optional) If year is strictly required for your new logic to work, 
-- you can set a default for existing rows if needed, or simply leave it nullable
-- since old sessions expire in 5 minutes anyway and will be cleaned up.
