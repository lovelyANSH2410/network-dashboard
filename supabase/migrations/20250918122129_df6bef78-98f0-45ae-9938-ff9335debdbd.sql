-- Fix email leak security issue - corrected version without duplicate columns

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create new secure RLS policy for public profiles
CREATE POLICY "Public profiles viewable with privacy controls" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own full profile
  auth.uid() = user_id
  OR
  -- Public profiles are visible but with privacy restrictions
  (is_public = true AND status != 'Inactive')
);

-- Update the member_directory view to use privacy-aware data (fix duplicate columns)
DROP VIEW IF EXISTS public.member_directory;

CREATE VIEW public.member_directory AS
SELECT 
  id,
  first_name,
  last_name,
  CASE WHEN show_contact_info = true THEN email ELSE NULL END as email,
  CASE WHEN show_contact_info = true THEN phone ELSE NULL END as phone,
  program,
  graduation_year,
  organization,
  organization_type,
  position,
  experience_level,
  CASE WHEN show_location = true THEN location ELSE NULL END as location,
  CASE WHEN show_location = true THEN city ELSE NULL END as city,
  CASE WHEN show_location = true THEN country ELSE NULL END as country,
  CASE WHEN show_contact_info = true THEN linkedin_url ELSE NULL END as linkedin_url,
  CASE WHEN show_contact_info = true THEN website_url ELSE NULL END as website_url,
  bio,
  interests,
  skills,
  status,
  avatar_url
FROM public.profiles
WHERE is_public = true AND status != 'Inactive';

-- Grant access to member_directory view
GRANT SELECT ON public.member_directory TO anon, authenticated;