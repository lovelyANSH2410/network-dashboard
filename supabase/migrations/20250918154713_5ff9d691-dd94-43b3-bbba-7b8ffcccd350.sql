-- Remove the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Approved users can view other approved public profiles" ON public.profiles;

-- Create a security definer function to check if current user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND approval_status = 'approved'
  );
$$;

-- Create the correct policy using the security definer function
CREATE POLICY "Approved users can view other approved public profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Only approved users can see other profiles
  public.is_user_approved()
  -- And they can only see profiles that are approved and public
  AND approval_status = 'approved' 
  AND is_public = true
);