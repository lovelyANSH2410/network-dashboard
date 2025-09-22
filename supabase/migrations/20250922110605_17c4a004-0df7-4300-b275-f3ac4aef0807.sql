-- Create user_directory table for personal directory management
CREATE TABLE public.user_directory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    member_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, member_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;

-- Create policies for user_directory
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

-- Create index for better performance
CREATE INDEX idx_user_directory_user_id ON public.user_directory(user_id);
CREATE INDEX idx_user_directory_member_id ON public.user_directory(member_id);