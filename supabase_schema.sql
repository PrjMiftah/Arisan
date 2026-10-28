-- ============================================================================
-- SCHEMA & PERMISSION SUPABASE: Arisan Keluarga Adnan (Tabel: adnan_User)
-- ============================================================================

-- 1. Struktur tabel adnan_User
CREATE TABLE IF NOT EXISTS public."adnan_User" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'peserta',
    nama_lengkap TEXT NOT NULL,
    deskripsi TEXT,
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Berikan hak akses (GRANT) ke role anon dan authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public."adnan_User" TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Konfigurasi Row Level Security (RLS) agar REST API bisa membaca & menambah user
ALTER TABLE public."adnan_User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select adnan_User" ON public."adnan_User";
CREATE POLICY "Allow anon select adnan_User"
    ON public."adnan_User"
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon insert adnan_User" ON public."adnan_User";
CREATE POLICY "Allow anon insert adnan_User"
    ON public."adnan_User"
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update adnan_User" ON public."adnan_User";
CREATE POLICY "Allow anon update adnan_User"
    ON public."adnan_User"
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
