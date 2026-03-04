-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read departments (useful for filters and selects)
CREATE POLICY "Enable read access for all users" ON public.departments 
    FOR SELECT USING (true);

-- Allow Admins to insert, update and delete departments 
CREATE POLICY "Enable insert access for admins" ON public.departments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'Admin'
        )
    );

CREATE POLICY "Enable update access for admins" ON public.departments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'Admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'Admin'
        )
    );

CREATE POLICY "Enable delete access for admins" ON public.departments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'Admin'
        )
    );

-- Insert initial department data
INSERT INTO public.departments (name) VALUES 
    ('Art'),
    ('English'),
    ('Chemical'),
    ('Math'),
    ('Computer Science'),
    ('Physics')
ON CONFLICT (name) DO NOTHING;
