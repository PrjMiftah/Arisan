-- ============================================================================
-- SCHEMA & PERMISSION SUPABASE: Arisan Keluarga Adnan
-- Tabel: public."adnan_User" & public."adnan_DataAnggota"
-- Jalankan script ini di Supabase SQL Editor
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

-- 2. Struktur tabel adnan_DataAnggota (Biodata Peserta Arisan)
CREATE TABLE IF NOT EXISTS public."adnan_DataAnggota" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    nama_panggilan TEXT,
    jenis_kelamin TEXT,
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    pekerjaan TEXT,
    no_hp TEXT,
    email TEXT,
    alamat TEXT,
    kota TEXT,
    nama_pasangan TEXT,
    jumlah_anak INTEGER DEFAULT 0,
    silsilah_keluarga TEXT,
    nama_bank TEXT,
    no_rekening TEXT,
    atas_nama_rekening TEXT,
    jumlah_ikut_arisan INTEGER DEFAULT 1,
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan seluruh kolom tersedia pada adnan_DataAnggota jika tabel sudah dibuat sebelumnya
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_lengkap TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_panggilan TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS tempat_lahir TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS tanggal_lahir DATE;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS pekerjaan TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS no_hp TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS kota TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_pasangan TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS jumlah_anak INTEGER DEFAULT 0;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS silsilah_keluarga TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_bank TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS no_rekening TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS atas_nama_rekening TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS jumlah_ikut_arisan INTEGER DEFAULT 1;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS status_aktif BOOLEAN DEFAULT true;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Berikan hak akses (GRANT) ke role anon dan authenticated untuk SEMUA tabel di schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Konfigurasi Row Level Security (RLS) untuk adnan_User
ALTER TABLE public."adnan_User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select adnan_User" ON public."adnan_User";
CREATE POLICY "Allow anon select adnan_User"
    ON public."adnan_User" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon insert adnan_User" ON public."adnan_User";
CREATE POLICY "Allow anon insert adnan_User"
    ON public."adnan_User" FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update adnan_User" ON public."adnan_User";
CREATE POLICY "Allow anon update adnan_User"
    ON public."adnan_User" FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Konfigurasi Row Level Security (RLS) untuk adnan_DataAnggota
ALTER TABLE public."adnan_DataAnggota" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select adnan_DataAnggota" ON public."adnan_DataAnggota";
CREATE POLICY "Allow anon select adnan_DataAnggota"
    ON public."adnan_DataAnggota" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon insert adnan_DataAnggota" ON public."adnan_DataAnggota";
CREATE POLICY "Allow anon insert adnan_DataAnggota"
    ON public."adnan_DataAnggota" FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update adnan_DataAnggota" ON public."adnan_DataAnggota";
CREATE POLICY "Allow anon update adnan_DataAnggota"
    ON public."adnan_DataAnggota" FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
