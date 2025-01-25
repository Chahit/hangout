-- Add answers column to dating_profiles table
ALTER TABLE public.dating_profiles 
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

-- Add has_completed_profile column if it doesn't exist
ALTER TABLE public.dating_profiles 
ADD COLUMN IF NOT EXISTS has_completed_profile BOOLEAN DEFAULT false; 