-- Make email column nullable in otp_codes table to support phone-only OTP requests
ALTER TABLE public.otp_codes ALTER COLUMN email DROP NOT NULL;