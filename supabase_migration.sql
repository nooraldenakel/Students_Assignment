-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Copy users from app_users to auth.users
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  id,
  'authenticated',
  'authenticated',
  email,
  crypt(password, gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('name', name, 'role', role, 'allowed_departments', allowed_departments),
  false
FROM public.app_users;

-- 3. Create identities in auth.identities
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id,
  format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
  'email',
  id::text,
  now(),
  now(),
  now()
FROM public.app_users;

-- 4. Secure app_users: Link to auth.users and drop password column
ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.app_users DROP COLUMN password;

-- 5. Enable RLS on all tables
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- app_users: Authenticated users can read. Admins can manage via RPCs, but let's allow read and update directly.
CREATE POLICY "Allow read access to auth users" ON public.app_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update access to admins" ON public.app_users FOR UPDATE TO authenticated USING (
  (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin'
);

-- students & assignments: Authenticated users can read. Admins/Operators can write.
CREATE POLICY "Allow read access to auth users" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to Admin/Operator" ON public.students FOR ALL TO authenticated USING (
  (SELECT role FROM public.app_users WHERE id = auth.uid()) IN ('Admin', 'Operator')
);

CREATE POLICY "Allow read access to auth users" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to Admin/Operator" ON public.assignments FOR ALL TO authenticated USING (
  (SELECT role FROM public.app_users WHERE id = auth.uid()) IN ('Admin', 'Operator')
);

-- departments & settings: Authenticated users can read. Admins can write.
CREATE POLICY "Allow read access to auth users" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to Admins" ON public.departments FOR ALL TO authenticated USING (
  (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin'
);

CREATE POLICY "Allow read access to auth users" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to Admins" ON public.settings FOR ALL TO authenticated USING (
  (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin'
);

-- 7. Create RPC for creating users securely
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_allowed_departments TEXT[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  new_user_id uuid;
  clean_email TEXT;
BEGIN
  -- 1. Check if the current user is an Admin
  IF (SELECT role FROM public.app_users WHERE id = auth.uid()) != 'Admin' THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن تكون مديراً (Admin) لإضافة مستخدم';
  END IF;

  clean_email := lower(trim(p_email));

  -- 2. Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = clean_email) OR 
     EXISTS (SELECT 1 FROM public.app_users WHERE lower(email) = clean_email) THEN
    RAISE EXCEPTION 'هذا البريد الإلكتروني مسجل مسبقاً: %', clean_email;
  END IF;

  -- 3. Create user ID
  new_user_id := gen_random_uuid();
  
  -- 4. Insert into auth.users with all required non-null string token fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    email_change,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    clean_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name, 'role', p_role, 'allowed_departments', p_allowed_departments),
    false
  );

  -- 5. Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', clean_email),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );

  -- 6. Insert into public.app_users
  INSERT INTO public.app_users (id, name, email, role, allowed_departments)
  VALUES (new_user_id, p_name, clean_email, p_role, p_allowed_departments)
  ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        allowed_departments = EXCLUDED.allowed_departments;

  RETURN new_user_id;
END;
$$;

-- 8. Create RPC for deleting users securely
CREATE OR REPLACE FUNCTION public.delete_app_user(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  IF (SELECT role FROM public.app_users WHERE id = auth.uid()) != 'Admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
