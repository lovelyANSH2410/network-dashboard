-- Create table to store OTP codes temporarily
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policies (no user access needed, only edge functions will use this)
CREATE POLICY "Service role can manage OTP codes" 
ON public.otp_codes 
FOR ALL 
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_otp_codes_updated_at
BEFORE UPDATE ON public.otp_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();