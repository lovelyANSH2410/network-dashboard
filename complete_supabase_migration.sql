-- ============================================================================
-- COMPLETE SUPABASE BACKEND MIGRATION SCRIPT
-- ============================================================================
-- This script contains all database schema, tables, functions, policies, and
-- triggers needed to replicate the complete Supabase backend for production.
-- 
-- Usage: Run this script in your Supabase SQL Editor or PostgreSQL client
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: ENUM TYPES
-- ============================================================================
-- Organization types enum
DO $$ BEGIN
    CREATE TYPE public.organization_type AS ENUM (
        'Corporate', 'Startup', 'Non-Profit', 'Government', 
        'Consulting', 'Education', 'Healthcare', 'Technology', 
        'Finance', 'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Experience level enum
DO $$ BEGIN
    CREATE TYPE public.experience_level AS ENUM (
        'Entry Level', 'Mid Level', 'Senior Level', 
        'Executive', 'Student', 'Recent Graduate'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Profile status enum
DO $$ BEGIN
    CREATE TYPE public.profile_status AS ENUM (
        'Active', 'Alumni', 'Student', 'Faculty', 'Inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- User role enum
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'normal_user');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Profile approval status enum
DO $$ BEGIN
    CREATE TYPE public.profile_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Profile update request status enum
DO $$ BEGIN
    CREATE TYPE public.profile_update_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 3: CORE TABLES - PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    country_code TEXT,
    
    -- Professional Information
    program TEXT,
    graduation_year INTEGER,
    organization TEXT,
    organization_type organization_type,
    position TEXT,
    experience_level experience_level,
    
    -- Location
    location TEXT,
    city TEXT,
    country TEXT,
    pincode TEXT,
    address TEXT,
    
    -- Social/Contact
    linkedin_url TEXT,
    website_url TEXT,
    
    -- Profile Details
    bio TEXT,
    interests TEXT[],
    skills TEXT[],
    status profile_status DEFAULT 'Active',
    gender TEXT,
    date_of_birth DATE,
    
    -- Privacy Settings
    show_contact_info BOOLEAN DEFAULT false,
    show_location BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    
    -- Approval System
    approval_status profile_approval_status DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    under_registration BOOLEAN DEFAULT FALSE,
    
    -- Emergency Contacts
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    -- Additional Fields
    preferred_mode_of_communication TEXT[],
    organizations JSONB,
    avatar_url TEXT,
    change_history JSONB DEFAULT '[]'::jsonb,
    
    -- Mentoring & Contribution
    willing_to_mentor TEXT CHECK (willing_to_mentor IN ('Yes','No','Maybe')),
    areas_of_contribution TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint for preferred communication
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS check_preferred_communication 
CHECK (
    preferred_mode_of_communication IS NULL OR 
    preferred_mode_of_communication <@ ARRAY['Phone', 'Email', 'WhatsApp', 'LinkedIn']::TEXT[]
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_type ON public.profiles(organization_type);
CREATE INDEX IF NOT EXISTS idx_profiles_graduation_year ON public.profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_profiles_organizations ON public.profiles USING GIN (organizations);
CREATE INDEX IF NOT EXISTS idx_profiles_change_history ON public.profiles USING GIN (change_history);

-- ============================================================================
-- SECTION 4: USER ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL DEFAULT 'normal_user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- ============================================================================
-- SECTION 5: PROFILE CHANGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    changed_by_name TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'approve', 'reject', 'admin_edit')),
    changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_changes_profile_user_id ON public.profile_changes(profile_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_changed_at ON public.profile_changes(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_changes_change_type ON public.profile_changes(change_type);

-- ============================================================================
-- SECTION 6: USER STARRED PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_starred_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    starred_profile_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, starred_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_user_starred_profiles_user_id ON public.user_starred_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_starred_profiles_starred_profile_id ON public.user_starred_profiles(starred_profile_id);

-- ============================================================================
-- SECTION 7: USER DIRECTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_directory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    member_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_user_directory_user_id ON public.user_directory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_directory_member_id ON public.user_directory(member_id);

-- ============================================================================
-- SECTION 8: CITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL,
    state_province TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);
CREATE INDEX IF NOT EXISTS idx_cities_state_province ON public.cities(state_province);

-- ============================================================================
-- SECTION 9: ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organizations_name_unique'
    ) THEN
        ALTER TABLE public.organizations 
        ADD CONSTRAINT organizations_name_unique UNIQUE (name);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_is_verified ON public.organizations(is_verified);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- ============================================================================
-- SECTION 10: OTP CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT,
    phone TEXT,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- ============================================================================
-- SECTION 11: PROFILE UPDATE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submitted_payload JSONB NOT NULL,
    status public.profile_update_request_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 12: FUNCTIONS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update cities updated_at
CREATE OR REPLACE FUNCTION public.update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = $1 AND role = 'admin'
    );
$$;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
$$;

-- Function to check if user is approved
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

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into profiles table
    INSERT INTO public.profiles (
        user_id,
        email,
        first_name,
        last_name,
        approval_status
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name',
        'pending'
    );
    
    -- Insert into user_roles table (default normal_user)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'normal_user');
    
    RETURN NEW;
END;
$$;

-- Function to approve user profile
CREATE OR REPLACE FUNCTION public.approve_user_profile(profile_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can approve profiles';
    END IF;
    
    -- Update profile status
    UPDATE public.profiles 
    SET 
        approval_status = 'approved',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    WHERE user_id = profile_user_id;
END;
$$;

-- Function to reject user profile
CREATE OR REPLACE FUNCTION public.reject_user_profile(profile_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can reject profiles';
    END IF;
    
    -- Update profile status
    UPDATE public.profiles 
    SET 
        approval_status = 'rejected',
        approved_by = auth.uid(),
        approved_at = now(),
        rejection_reason = reason,
        updated_at = now()
    WHERE user_id = profile_user_id;
END;
$$;

-- Function to add a profile change
CREATE OR REPLACE FUNCTION public.add_profile_change(
    profile_user_id UUID,
    changed_by UUID,
    changed_by_name TEXT,
    changed_fields JSONB,
    change_type TEXT DEFAULT 'update'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    change_id UUID;
BEGIN
    -- Insert the change record
    INSERT INTO public.profile_changes (
        profile_user_id,
        changed_by,
        changed_by_name,
        change_type,
        changed_fields
    ) VALUES (
        profile_user_id,
        changed_by,
        changed_by_name,
        change_type,
        changed_fields
    ) RETURNING id INTO change_id;
    
    RETURN change_id;
END;
$$;

-- Function to get profile changes for a user
CREATE OR REPLACE FUNCTION public.get_profile_changes(profile_user_id UUID)
RETURNS TABLE (
    id UUID,
    changed_by UUID,
    changed_by_name TEXT,
    changed_at TIMESTAMP WITH TIME ZONE,
    change_type TEXT,
    changed_fields JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user can view these changes
    IF NOT (profile_user_id = auth.uid() OR public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT 
        pc.id,
        pc.changed_by,
        pc.changed_by_name,
        pc.changed_at,
        pc.change_type,
        pc.changed_fields
    FROM public.profile_changes pc
    WHERE pc.profile_user_id = get_profile_changes.profile_user_id
    ORDER BY pc.changed_at DESC;
END;
$$;

-- Function to track profile changes
CREATE OR REPLACE FUNCTION public.track_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_record JSONB;
    changed_fields TEXT[];
    field_name TEXT;
    old_value TEXT;
    new_value TEXT;
BEGIN
    -- Only track changes on UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        changed_fields := ARRAY[]::TEXT[];
        
        -- Check each field for changes (excluding metadata fields)
        IF OLD.first_name IS DISTINCT FROM NEW.first_name THEN
            changed_fields := array_append(changed_fields, 'first_name');
        END IF;
        IF OLD.last_name IS DISTINCT FROM NEW.last_name THEN
            changed_fields := array_append(changed_fields, 'last_name');
        END IF;
        IF OLD.email IS DISTINCT FROM NEW.email THEN
            changed_fields := array_append(changed_fields, 'email');
        END IF;
        IF OLD.phone IS DISTINCT FROM NEW.phone THEN
            changed_fields := array_append(changed_fields, 'phone');
        END IF;
        IF OLD.organization IS DISTINCT FROM NEW.organization THEN
            changed_fields := array_append(changed_fields, 'organization');
        END IF;
        IF OLD.organization_type IS DISTINCT FROM NEW.organization_type THEN
            changed_fields := array_append(changed_fields, 'organization_type');
        END IF;
        IF OLD.position IS DISTINCT FROM NEW.position THEN
            changed_fields := array_append(changed_fields, 'position');
        END IF;
        IF OLD.experience_level IS DISTINCT FROM NEW.experience_level THEN
            changed_fields := array_append(changed_fields, 'experience_level');
        END IF;
        IF OLD.bio IS DISTINCT FROM NEW.bio THEN
            changed_fields := array_append(changed_fields, 'bio');
        END IF;
        IF OLD.location IS DISTINCT FROM NEW.location THEN
            changed_fields := array_append(changed_fields, 'location');
        END IF;
        IF OLD.city IS DISTINCT FROM NEW.city THEN
            changed_fields := array_append(changed_fields, 'city');
        END IF;
        IF OLD.country IS DISTINCT FROM NEW.country THEN
            changed_fields := array_append(changed_fields, 'country');
        END IF;
        IF OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url THEN
            changed_fields := array_append(changed_fields, 'linkedin_url');
        END IF;
        IF OLD.website_url IS DISTINCT FROM NEW.website_url THEN
            changed_fields := array_append(changed_fields, 'website_url');
        END IF;
        IF OLD.interests IS DISTINCT FROM NEW.interests THEN
            changed_fields := array_append(changed_fields, 'interests');
        END IF;
        IF OLD.skills IS DISTINCT FROM NEW.skills THEN
            changed_fields := array_append(changed_fields, 'skills');
        END IF;
        IF OLD.program IS DISTINCT FROM NEW.program THEN
            changed_fields := array_append(changed_fields, 'program');
        END IF;
        IF OLD.graduation_year IS DISTINCT FROM NEW.graduation_year THEN
            changed_fields := array_append(changed_fields, 'graduation_year');
        END IF;
        IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
            changed_fields := array_append(changed_fields, 'avatar_url');
        END IF;
        IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
            changed_fields := array_append(changed_fields, 'approval_status');
        END IF;
        
        -- Only create a change record if there are actual changes
        IF array_length(changed_fields, 1) > 0 THEN
            change_record := jsonb_build_object(
                'updatedBy', COALESCE(auth.uid()::text, 'system'),
                'updatedAt', now(),
                'changedFields', to_jsonb(changed_fields),
                'isAdmin', public.is_admin(auth.uid())
            );
            
            -- Append the change record to the change_history array
            NEW.change_history := COALESCE(NEW.change_history, '[]'::jsonb) || change_record;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Functions for organizations table
CREATE OR REPLACE FUNCTION public.set_organizations_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at for profile update requests
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- RPC: submit_profile_update_request(payload)
CREATE OR REPLACE FUNCTION public.submit_profile_update_request(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Only authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profile_update_requests (
    profile_user_id,
    submitted_by,
    submitted_payload,
    status
  ) VALUES (
    auth.uid(),
    auth.uid(),
    payload,
    'pending'
  ) RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

-- RPC: approve_profile_update_request(request_id, override_payload)
CREATE OR REPLACE FUNCTION public.approve_profile_update_request(
  request_id UUID,
  override_payload JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  final_payload JSONB;
  current_profile RECORD;
  merged_profile JSONB;
BEGIN
  -- Only admins
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve requests';
  END IF;

  SELECT * INTO req FROM public.profile_update_requests WHERE id = request_id;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  final_payload := COALESCE(override_payload, req.submitted_payload);

  -- Fetch current profile row for diff purposes
  SELECT * INTO current_profile FROM public.profiles WHERE user_id = req.profile_user_id FOR UPDATE;
  IF current_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Apply update
  UPDATE public.profiles p
  SET
    first_name = COALESCE(final_payload->>'first_name', p.first_name),
    last_name = COALESCE(final_payload->>'last_name', p.last_name),
    email = COALESCE(final_payload->>'email', p.email),
    phone = COALESCE(final_payload->>'phone', p.phone),
    country_code = COALESCE(final_payload->>'country_code', p.country_code),
    gender = COALESCE(final_payload->>'gender', p.gender),
    program = COALESCE(final_payload->>'program', p.program),
    graduation_year = COALESCE((final_payload->>'graduation_year')::INT, p.graduation_year),
    organization = COALESCE(final_payload->>'organization', p.organization),
    organization_type = COALESCE((final_payload->>'organization_type')::public.organization_type, p.organization_type),
    position = COALESCE(final_payload->>'position', p.position),
    experience_level = COALESCE((final_payload->>'experience_level')::public.experience_level, p.experience_level),
    location = COALESCE(final_payload->>'location', p.location),
    city = COALESCE(final_payload->>'city', p.city),
    country = COALESCE(final_payload->>'country', p.country),
    pincode = COALESCE(final_payload->>'pincode', p.pincode),
    linkedin_url = COALESCE(final_payload->>'linkedin_url', p.linkedin_url),
    website_url = COALESCE(final_payload->>'website_url', p.website_url),
    bio = COALESCE(final_payload->>'bio', p.bio),
    interests = COALESCE(ARRAY(SELECT jsonb_array_elements_text(final_payload->'interests')), p.interests),
    skills = COALESCE(ARRAY(SELECT jsonb_array_elements_text(final_payload->'skills')), p.skills),
    show_contact_info = COALESCE((final_payload->>'show_contact_info')::BOOLEAN, p.show_contact_info),
    show_location = COALESCE((final_payload->>'show_location')::BOOLEAN, p.show_location),
    is_public = COALESCE((final_payload->>'is_public')::BOOLEAN, p.is_public),
    avatar_url = COALESCE(final_payload->>'avatar_url', p.avatar_url),
    date_of_birth = COALESCE((final_payload->>'date_of_birth')::DATE, p.date_of_birth),
    address = COALESCE(final_payload->>'address', p.address),
    emergency_contact_name = COALESCE(final_payload->>'emergency_contact_name', p.emergency_contact_name),
    emergency_contact_phone = COALESCE(final_payload->>'emergency_contact_phone', p.emergency_contact_phone),
    preferred_mode_of_communication = COALESCE(ARRAY(SELECT jsonb_array_elements_text(final_payload->'preferred_mode_of_communication')), p.preferred_mode_of_communication),
    organizations = COALESCE(final_payload->'organizations', p.organizations)
  WHERE p.user_id = req.profile_user_id;

  -- Mark request approved
  UPDATE public.profile_update_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = request_id;

  -- Record change in timeline as initiated by user
  PERFORM public.add_profile_change(
    req.profile_user_id,
    req.submitted_by,
    (SELECT coalesce((SELECT email FROM auth.users WHERE id = req.submitted_by), 'User')),
    final_payload,
    'update'
  );

END;
$$;

-- RPC: reject_profile_update_request(request_id, reason)
CREATE OR REPLACE FUNCTION public.reject_profile_update_request(
  request_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  -- Only admins
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reject requests';
  END IF;

  SELECT * INTO req FROM public.profile_update_requests WHERE id = request_id;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  UPDATE public.profile_update_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = reason
  WHERE id = request_id;

  -- Record rejection in timeline (no profile changes applied)
  PERFORM public.add_profile_change(
    req.profile_user_id,
    req.submitted_by,
    (SELECT coalesce((SELECT email FROM auth.users WHERE id = req.submitted_by), 'User')),
    jsonb_build_object('approval_status', jsonb_build_object('oldValue', 'pending', 'newValue', 'rejected'), 'rejection_reason', jsonb_build_object('oldValue', NULL, 'newValue', reason)),
    'reject'
  );

END;
$$;

-- ============================================================================
-- SECTION 13: TRIGGERS
-- ============================================================================

-- Trigger for automatic timestamp updates on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic profile creation on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to track profile changes
DROP TRIGGER IF EXISTS track_profile_changes_trigger ON public.profiles;
CREATE TRIGGER track_profile_changes_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.track_profile_changes();

-- Trigger for cities updated_at
DROP TRIGGER IF EXISTS update_cities_updated_at ON public.cities;
CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON public.cities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cities_updated_at();

-- Trigger for organizations audit fields
DROP TRIGGER IF EXISTS set_organizations_audit_fields ON public.organizations;
CREATE TRIGGER set_organizations_audit_fields
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organizations_audit_fields();

-- Trigger for user_roles updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for otp_codes updated_at
DROP TRIGGER IF EXISTS update_otp_codes_updated_at ON public.otp_codes;
CREATE TRIGGER update_otp_codes_updated_at
    BEFORE UPDATE ON public.otp_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for profile_update_requests updated_at
DROP TRIGGER IF EXISTS update_profile_update_requests_updated_at ON public.profile_update_requests;
CREATE TRIGGER update_profile_update_requests_updated_at
  BEFORE UPDATE ON public.profile_update_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 14: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_starred_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 15: RLS POLICIES - PROFILES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles viewable with privacy controls" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone with privacy controls" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own pending profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own avatar_url" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view other approved public profiles" ON public.profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id AND approval_status = 'pending');

CREATE POLICY "Users can update their own avatar_url" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = user_id);

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

-- ============================================================================
-- SECTION 16: RLS POLICIES - USER ROLES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;

CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert roles" ON public.user_roles
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles" ON public.user_roles
    FOR UPDATE USING (public.is_admin(auth.uid()));

-- ============================================================================
-- SECTION 17: RLS POLICIES - PROFILE CHANGES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile changes" ON public.profile_changes;
DROP POLICY IF EXISTS "Admins can view all profile changes" ON public.profile_changes;
DROP POLICY IF EXISTS "Users can insert their own profile changes" ON public.profile_changes;

CREATE POLICY "Users can view their own profile changes" 
ON public.profile_changes 
FOR SELECT 
USING (profile_user_id = auth.uid());

CREATE POLICY "Admins can view all profile changes" 
ON public.profile_changes 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile changes" 
ON public.profile_changes 
FOR INSERT 
WITH CHECK (profile_user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================================
-- SECTION 18: RLS POLICIES - USER STARRED PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own starred profiles" ON public.user_starred_profiles;
DROP POLICY IF EXISTS "Users can insert their own starred profiles" ON public.user_starred_profiles;
DROP POLICY IF EXISTS "Users can delete their own starred profiles" ON public.user_starred_profiles;

CREATE POLICY "Users can view their own starred profiles" 
ON public.user_starred_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own starred profiles" 
ON public.user_starred_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own starred profiles" 
ON public.user_starred_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 19: RLS POLICIES - USER DIRECTORY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own directory entries" ON public.user_directory;
DROP POLICY IF EXISTS "Users can add to their own directory" ON public.user_directory;
DROP POLICY IF EXISTS "Users can remove from their own directory" ON public.user_directory;

CREATE POLICY "Users can view their own directory entries" 
ON public.user_directory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own directory" 
ON public.user_directory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own directory" 
ON public.user_directory 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 20: RLS POLICIES - CITIES
-- ============================================================================

DROP POLICY IF EXISTS "Cities are viewable by everyone" ON public.cities;
DROP POLICY IF EXISTS "Authenticated users can insert cities" ON public.cities;
DROP POLICY IF EXISTS "Authenticated users can update cities" ON public.cities;

CREATE POLICY "Cities are viewable by everyone" 
ON public.cities 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert cities" 
ON public.cities 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cities" 
ON public.cities 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- SECTION 21: RLS POLICIES - ORGANIZATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update organizations they created" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;

CREATE POLICY "Admins can view all organizations"
ON public.organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update organizations"
ON public.organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can delete organizations"
ON public.organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================================================
-- SECTION 22: RLS POLICIES - OTP CODES
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage OTP codes" ON public.otp_codes;

CREATE POLICY "Service role can manage OTP codes" 
ON public.otp_codes 
FOR ALL 
USING (true);

-- ============================================================================
-- SECTION 23: RLS POLICIES - PROFILE UPDATE REQUESTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own profile update requests" ON public.profile_update_requests;
DROP POLICY IF EXISTS "Users can view their own profile update requests" ON public.profile_update_requests;
DROP POLICY IF EXISTS "Admins can view all profile update requests" ON public.profile_update_requests;
DROP POLICY IF EXISTS "Admins can update all profile update requests" ON public.profile_update_requests;

CREATE POLICY "Users can insert their own profile update requests"
ON public.profile_update_requests
FOR INSERT
WITH CHECK (submitted_by = auth.uid() AND profile_user_id = auth.uid());

CREATE POLICY "Users can view their own profile update requests"
ON public.profile_update_requests
FOR SELECT
USING (submitted_by = auth.uid() OR profile_user_id = auth.uid());

CREATE POLICY "Admins can view all profile update requests"
ON public.profile_update_requests
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profile update requests"
ON public.profile_update_requests
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- SECTION 24: VIEWS
-- ============================================================================

-- Member directory view (respects privacy settings)
DROP VIEW IF EXISTS public.member_directory;
CREATE VIEW public.member_directory AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.gender,
    p.program,
    p.graduation_year,
    p.organization,
    p.organization_type,
    p.position,
    p.experience_level,
    CASE WHEN p.show_location THEN p.location ELSE NULL END as location,
    CASE WHEN p.show_location THEN p.city ELSE NULL END as city,
    CASE WHEN p.show_location THEN p.country ELSE NULL END as country,
    CASE WHEN p.show_location THEN p.pincode ELSE NULL END as pincode,
    CASE WHEN p.show_contact_info THEN p.email ELSE NULL END as email,
    CASE WHEN p.show_contact_info THEN p.phone ELSE NULL END as phone,
    CASE WHEN p.show_contact_info THEN p.linkedin_url ELSE NULL END as linkedin_url,
    p.website_url,
    p.bio,
    p.interests,
    p.skills,
    p.status,
    p.avatar_url
FROM public.profiles p
WHERE p.is_public = true AND p.status = 'Active' AND p.approval_status = 'approved';

GRANT SELECT ON public.member_directory TO authenticated, anon;

-- ============================================================================
-- SECTION 25: STORAGE POLICIES
-- ============================================================================

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

-- Create policies for profile picture uploads
CREATE POLICY "Public Access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile pictures" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- SECTION 26: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_profile_change(UUID, UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_changes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_profile_update_request(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_profile_update_request(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_profile_update_request(UUID, TEXT) TO authenticated;

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON public.cities TO authenticated, anon;

-- ============================================================================
-- SECTION 27: SEED DATA (OPTIONAL)
-- ============================================================================

-- Insert common cities (only if they don't exist)
INSERT INTO public.cities (name, country, state_province) VALUES
('Mumbai', 'India', 'Maharashtra'),
('Delhi', 'India', 'Delhi'),
('Bangalore', 'India', 'Karnataka'),
('Chennai', 'India', 'Tamil Nadu'),
('Kolkata', 'India', 'West Bengal'),
('Hyderabad', 'India', 'Telangana'),
('Pune', 'India', 'Maharashtra'),
('Ahmedabad', 'India', 'Gujarat'),
('Jaipur', 'India', 'Rajasthan'),
('Lucknow', 'India', 'Uttar Pradesh'),
('New York', 'United States', 'New York'),
('Los Angeles', 'United States', 'California'),
('Chicago', 'United States', 'Illinois'),
('Houston', 'United States', 'Texas'),
('Phoenix', 'United States', 'Arizona'),
('London', 'United Kingdom', 'England'),
('Manchester', 'United Kingdom', 'England'),
('Birmingham', 'United Kingdom', 'England'),
('Toronto', 'Canada', 'Ontario'),
('Vancouver', 'Canada', 'British Columbia'),
('Sydney', 'Australia', 'New South Wales'),
('Melbourne', 'Australia', 'Victoria'),
('Singapore', 'Singapore', 'Singapore'),
('Dubai', 'United Arab Emirates', 'Dubai'),
('Hong Kong', 'Hong Kong', 'Hong Kong'),
('Tokyo', 'Japan', 'Tokyo'),
('Seoul', 'South Korea', 'Seoul'),
('Shanghai', 'China', 'Shanghai'),
('Beijing', 'China', 'Beijing')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SECTION 28: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles table with comprehensive information';
COMMENT ON COLUMN public.profiles.preferred_mode_of_communication IS 'Array of preferred communication methods: Phone, Email, WhatsApp, LinkedIn';
COMMENT ON COLUMN public.profiles.organizations IS 'JSONB array of organization objects with fields: currentOrg, orgType, experience, description, role';
COMMENT ON COLUMN public.profiles.program IS 'Program type: MBA-PGDBM, MBA-FABM, MBA-PGPX, PhD, MBA-FPGP, ePGD-ABA, FDP, AFP, SMP, Other';
COMMENT ON COLUMN public.profiles.gender IS 'Gender identity of the user';
COMMENT ON COLUMN public.profiles.pincode IS 'Postal/ZIP code of the user';
COMMENT ON COLUMN public.profiles.under_registration IS 'Tracks if user is currently in the registration process';
COMMENT ON TABLE public.profile_changes IS 'Tracks all changes made to user profiles with detailed change information';
COMMENT ON TABLE public.user_starred_profiles IS 'Tracks which profiles each user has starred';
COMMENT ON TABLE public.user_directory IS 'Personal directory management for users';
COMMENT ON TABLE public.cities IS 'Cities reference table';
COMMENT ON TABLE public.organizations IS 'Organizations table with RLS policies allowing admin CRUD operations';
COMMENT ON COLUMN public.organizations.name IS 'Unique organization name';
COMMENT ON COLUMN public.organizations.domain IS 'Organization website domain (optional)';
COMMENT ON COLUMN public.organizations.is_verified IS 'Whether the organization is verified by admin';
COMMENT ON COLUMN public.organizations.created_by IS 'User who created this organization (auto-set)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Your Supabase backend has been fully migrated!
-- 
-- Next Steps:
-- 1. Verify all tables were created correctly
-- 2. Test RLS policies
-- 3. Create an admin user manually (insert into user_roles with role='admin')
-- 4. Test authentication and authorization flows
-- ============================================================================

