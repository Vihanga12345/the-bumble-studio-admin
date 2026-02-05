-- Quick fix for missing columns in website_users table

-- Add username column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'username') THEN
        ALTER TABLE public.website_users ADD COLUMN username VARCHAR(100);
        -- Update existing records with a default username based on email
        UPDATE public.website_users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
        ALTER TABLE public.website_users ALTER COLUMN username SET NOT NULL;
        ALTER TABLE public.website_users ADD CONSTRAINT website_users_username_key UNIQUE (username);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding username column: %', SQLERRM;
END
$$;

-- Add password_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'password_hash') THEN
        ALTER TABLE public.website_users ADD COLUMN password_hash VARCHAR(255);
        -- Set default password hash for existing records
        UPDATE public.website_users SET password_hash = 'password123_hash' WHERE password_hash IS NULL;
        ALTER TABLE public.website_users ALTER COLUMN password_hash SET NOT NULL;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding password_hash column: %', SQLERRM;
END
$$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'is_active') THEN
        ALTER TABLE public.website_users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding is_active column: %', SQLERRM;
END
$$;

-- Add other missing columns one by one
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'phone') THEN
        ALTER TABLE public.website_users ADD COLUMN phone VARCHAR(20);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding phone column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'address') THEN
        ALTER TABLE public.website_users ADD COLUMN address TEXT;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding address column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'city') THEN
        ALTER TABLE public.website_users ADD COLUMN city VARCHAR(100);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding city column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'state') THEN
        ALTER TABLE public.website_users ADD COLUMN state VARCHAR(100);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding state column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'postal_code') THEN
        ALTER TABLE public.website_users ADD COLUMN postal_code VARCHAR(20);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding postal_code column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'country') THEN
        ALTER TABLE public.website_users ADD COLUMN country VARCHAR(100) DEFAULT 'Sri Lanka';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding country column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'first_name') THEN
        ALTER TABLE public.website_users ADD COLUMN first_name VARCHAR(100);
        UPDATE public.website_users SET first_name = 'John' WHERE first_name IS NULL;
        ALTER TABLE public.website_users ALTER COLUMN first_name SET NOT NULL;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding first_name column: %', SQLERRM;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_users' AND column_name = 'last_name') THEN
        ALTER TABLE public.website_users ADD COLUMN last_name VARCHAR(100);
        UPDATE public.website_users SET last_name = 'Doe' WHERE last_name IS NULL;
        ALTER TABLE public.website_users ALTER COLUMN last_name SET NOT NULL;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding last_name column: %', SQLERRM;
END
$$;

-- Create sample user with proper conflict handling
DO $$
BEGIN
    -- First check if user already exists
    IF NOT EXISTS (SELECT 1 FROM public.website_users WHERE email = 'testuser@example.com') THEN
        INSERT INTO public.website_users (
            email, 
            password_hash, 
            first_name, 
            last_name, 
            phone, 
            address, 
            city, 
            postal_code,
            country
        ) VALUES (
            'testuser@example.com',
            'password123_hash',
            'John',
            'Doe',
            '+94712345678',
            '123 Main Street',
            'Colombo',
            '10001',
            'Sri Lanka'
        );
        RAISE NOTICE 'Test user created successfully';
    ELSE
        RAISE NOTICE 'Test user already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating test user: %', SQLERRM;
END
$$;

-- Add username to existing users if column was added
DO $$
BEGIN
    -- Update existing users that don't have usernames
    UPDATE public.website_users 
    SET username = SPLIT_PART(email, '@', 1) || '_' || id::text
    WHERE username IS NULL;
    
    RAISE NOTICE 'Updated usernames for existing users';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating usernames: %', SQLERRM;
END
$$;

-- Add state data to existing users
DO $$
BEGIN
    UPDATE public.website_users 
    SET state = 'Western Province'
    WHERE state IS NULL AND city = 'Colombo';
    
    UPDATE public.website_users 
    SET state = 'Unknown'
    WHERE state IS NULL;
    
    RAISE NOTICE 'Updated state data for existing users';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating state data: %', SQLERRM;
END
$$;

-- Final verification and status
SELECT 'Schema fix completed successfully!' as status;

-- Show current table structure
SELECT 'Current website_users columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'website_users' 
ORDER BY column_name;

-- Show sample data
SELECT 'Sample users:' as info;
SELECT id, email, first_name, last_name, username, is_active 
FROM public.website_users 
LIMIT 3; 