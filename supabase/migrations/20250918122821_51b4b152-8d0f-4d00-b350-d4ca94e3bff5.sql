-- Fix Security Definer View issue by removing the problematic member_directory view
-- Since we're not using it in the new admin system, we can safely drop it
DROP VIEW IF EXISTS public.member_directory;

-- Also remove the get_public_profiles function that was using SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_public_profiles();