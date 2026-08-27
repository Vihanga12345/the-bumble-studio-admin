-- Force remove trigger - CASCADE drops dependent triggers
DROP FUNCTION IF EXISTS public.update_website_visibility() CASCADE;
