-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS is disabled as the application uses a custom user role system rather than Supabase Auth.
-- ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Insert initial department data
INSERT INTO public.departments (name) VALUES 
    ('Art'),
    ('English'),
    ('Chemical'),
    ('Math'),
    ('Computer Science'),
    ('Physics')
ON CONFLICT (name) DO NOTHING;
