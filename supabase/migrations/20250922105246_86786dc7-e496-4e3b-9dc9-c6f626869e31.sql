-- Add country_code field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN country_code text;