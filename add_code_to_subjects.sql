-- Add 'code' column to 'subjects' table if it doesn't exist
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code VARCHAR(255);

-- To enforce unique Subject Codes, but prevent breaking existing data, 
-- we first generate a code for existing rows that don't have one.
UPDATE subjects SET code = lower(replace(name, ' ', '-')) WHERE code IS NULL;

-- Make it UNIQUE. We first drop the constraint if it exists just in case.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subjects_code_key'
    ) THEN
        ALTER TABLE subjects ADD CONSTRAINT subjects_code_key UNIQUE (code);
    END IF;
END $$;
