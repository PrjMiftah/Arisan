-- ============================================================================
-- SCHEMA & PERMISSION SUPABASE LENGKAP: Arisan Keluarga Adnan
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================================

-- 1. Tabel User Login (adnan_User)
CREATE TABLE IF NOT EXISTS public."adnan_User" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    username TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'peserta',
    nama_lengkap TEXT NOT NULL,
    nama TEXT,
    no_hp TEXT,
    foto_url TEXT,
    foto TEXT,
    deskripsi TEXT,
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."adnan_User" ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public."adnan_User" ADD COLUMN IF NOT EXISTS foto TEXT;

-- Tambahkan akun Admin default
INSERT INTO public."adnan_User" (user_id, username, password, role, nama_lengkap, nama, status_aktif)
VALUES ('admin', 'admin', 'admin123', 'admin', 'Admin Arisan Keluarga Adnan', 'Admin Arisan Keluarga Adnan', true)
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin', status_aktif = true;

-- 2. Tabel Biodata Anggota (adnan_DataAnggota) - Dilengkapi Header Kolom Foto
CREATE TABLE IF NOT EXISTS public."adnan_DataAnggota" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    nama_lengkap TEXT NOT NULL,
    panggilan TEXT,
    nama_panggilan TEXT,
    nama_ayah TEXT DEFAULT '-',
    nama_ibu TEXT,
    garis_sanad TEXT DEFAULT 'Bani Adnan',
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
    jumlah_slot INTEGER DEFAULT 1,
    jumlah_ikut_arisan INTEGER DEFAULT 1,
    foto_url TEXT,
    foto TEXT,
    status_aktif BOOLEAN DEFAULT true,
    sudah_menang BOOLEAN DEFAULT false,
    periode_menang_ke INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_panggilan TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS tempat_lahir TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS tanggal_lahir DATE;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS pekerjaan TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS kota TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_pasangan TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS jumlah_anak INTEGER DEFAULT 0;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS silsilah_keluarga TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS nama_bank TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS no_rekening TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS atas_nama_rekening TEXT;
ALTER TABLE public."adnan_DataAnggota" ADD COLUMN IF NOT EXISTS jumlah_ikut_arisan INTEGER DEFAULT 1;

-- 3. Tabel Setting Periode Arisan Utama (adnan_Arisan & adnan_PeriodeArisan)
-- Split Iuran per Orang: Uang Arisan Rp 100.000, Uang Kas Rp 40.000, Uang Konsumsi Rp 30.000 (Total Rp 170.000)
CREATE TABLE IF NOT EXISTS public."adnan_Arisan" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    periode_ke INTEGER NOT NULL,
    bulan_tahun TEXT NOT NULL,
    tanggal_arisan DATE,
    tempat_arisan TEXT,
    uang_arisan NUMERIC(15,2) DEFAULT 100000,
    uang_kas NUMERIC(15,2) DEFAULT 40000,
    uang_konsumsi NUMERIC(15,2) DEFAULT 30000,
    iuran_per_slot NUMERIC(15,2) DEFAULT 170000,
    sumbangan_wajib NUMERIC(15,2) DEFAULT 0,
    pemenang_id UUID,
    pemenang_nama TEXT,
    total_diterima NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'aktif',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."adnan_Arisan" ADD COLUMN IF NOT EXISTS uang_arisan NUMERIC(15,2) DEFAULT 100000;
ALTER TABLE public."adnan_Arisan" ADD COLUMN IF NOT EXISTS uang_kas NUMERIC(15,2) DEFAULT 40000;
ALTER TABLE public."adnan_Arisan" ADD COLUMN IF NOT EXISTS uang_konsumsi NUMERIC(15,2) DEFAULT 30000;

CREATE TABLE IF NOT EXISTS public."adnan_PeriodeArisan" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_periode TEXT NOT NULL,
    periode_ke INTEGER NOT NULL,
    bulan_tahun TEXT NOT NULL,
    tanggal_mulai DATE,
    tanggal_arisan DATE,
    tempat_arisan TEXT,
    uang_arisan NUMERIC(15,2) DEFAULT 100000,
    uang_kas NUMERIC(15,2) DEFAULT 40000,
    uang_konsumsi NUMERIC(15,2) DEFAULT 30000,
    iuran_per_slot NUMERIC(15,2) DEFAULT 170000,
    status TEXT DEFAULT 'aktif',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."adnan_PeriodeArisan" ADD COLUMN IF NOT EXISTS uang_arisan NUMERIC(15,2) DEFAULT 100000;
ALTER TABLE public."adnan_PeriodeArisan" ADD COLUMN IF NOT EXISTS uang_kas NUMERIC(15,2) DEFAULT 40000;
ALTER TABLE public."adnan_PeriodeArisan" ADD COLUMN IF NOT EXISTS uang_konsumsi NUMERIC(15,2) DEFAULT 30000;

-- 3B. Tabel Group Arisan (adnan_GroupArisan - Maksimal 5 Orang termasuk Penanggung Jawab)
CREATE TABLE IF NOT EXISTS public."adnan_GroupArisan" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_group TEXT NOT NULL,
    penanggung_jawab_id UUID,
    penanggung_jawab_nama TEXT NOT NULL,
    anggota_1_nama TEXT NOT NULL,
    anggota_2_nama TEXT,
    anggota_3_nama TEXT,
    anggota_4_nama TEXT,
    anggota_5_nama TEXT,
    anggota_list JSONB,
    jumlah_anggota INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Pemenang Arisan (adnan_PemenangArisan)
CREATE TABLE IF NOT EXISTS public."adnan_PemenangArisan" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    periode_id UUID,
    periode_ke INTEGER NOT NULL,
    bulan_tahun TEXT,
    anggota_id UUID,
    user_id TEXT,
    nama_pemenang TEXT NOT NULL,
    tanggal_undi DATE DEFAULT CURRENT_DATE,
    nominal_diterima NUMERIC(15,2) DEFAULT 0,
    metode_pencairan TEXT DEFAULT 'Transfer Bank',
    nama_bank TEXT,
    no_rekening TEXT,
    bukti_pencairan_url TEXT,
    keterangan TEXT,
    ditetapkan_oleh TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Pembayaran: Default Status Pending + Split Header Uang Arisan, Uang Kas & Konsumsi (adnan_Pembayaran)
CREATE TABLE IF NOT EXISTS public."adnan_Pembayaran" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_transaksi TEXT,
    anggota_id UUID,
    arisan_id UUID,
    periode_arisan TEXT,
    user_id TEXT,
    nama_pembayar TEXT NOT NULL,
    nama_group TEXT,
    penanggung_jawab TEXT,
    tanggal_bayar DATE DEFAULT CURRENT_DATE,
    jenis_bayar TEXT NOT NULL,
    uang_arisan NUMERIC(15,2) DEFAULT 0,
    uang_kas NUMERIC(15,2) DEFAULT 0,
    uang_konsumsi NUMERIC(15,2) DEFAULT 0,
    nominal NUMERIC(15,2) NOT NULL DEFAULT 0,
    metode_bayar TEXT NOT NULL DEFAULT 'Transfer Bank',
    nama_bank TEXT,
    no_rekening_pengirim TEXT,
    bukti_bayar_url TEXT,
    keterangan TEXT,
    status TEXT DEFAULT 'Pending',
    diverifikasi_oleh TEXT,
    diverifikasi_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."adnan_Pembayaran" ALTER COLUMN status SET DEFAULT 'Pending';
ALTER TABLE public."adnan_Pembayaran" DROP CONSTRAINT IF EXISTS "adnan_Pembayaran_jenis_bayar_check";
ALTER TABLE public."adnan_Pembayaran" DROP CONSTRAINT IF EXISTS "adnan_Pembayaran_metode_bayar_check";
ALTER TABLE public."adnan_Pembayaran" DROP CONSTRAINT IF EXISTS "adnan_Pembayaran_status_check";
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS periode_arisan TEXT;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS nama_group TEXT;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS penanggung_jawab TEXT;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS uang_arisan NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS uang_kas NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS uang_konsumsi NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS nama_bank TEXT;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS no_rekening_pengirim TEXT;
ALTER TABLE public."adnan_Pembayaran" ADD COLUMN IF NOT EXISTS bukti_bayar_url TEXT;

-- 6. Tabel Pengeluaran / Akuntansi Khusus Admin (adnan_Pengeluaran)
CREATE TABLE IF NOT EXISTS public."adnan_Pengeluaran" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_pengeluaran TEXT,
    arisan_id UUID,
    tanggal_pengeluaran DATE DEFAULT CURRENT_DATE,
    kategori TEXT NOT NULL,
    nama_pengeluaran TEXT,
    deskripsi TEXT,
    nominal NUMERIC(15,2) NOT NULL DEFAULT 0,
    metode_bayar TEXT DEFAULT 'Tunai',
    nama_bank TEXT,
    no_rekening TEXT,
    penerima TEXT,
    bukti_url TEXT,
    dicatat_oleh TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public."adnan_Pengeluaran" ADD COLUMN IF NOT EXISTS no_rekening TEXT;

-- 7. Tabel Pengumuman & Dokumen PDF (adnan_Pengumuman)
CREATE TABLE IF NOT EXISTS public."adnan_Pengumuman" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    judul TEXT NOT NULL,
    kategori TEXT DEFAULT 'Pengumuman Umum',
    isi TEXT,
    isi_pengumuman TEXT,
    tanggal_pengumuman DATE DEFAULT CURRENT_DATE,
    file_pdf_url TEXT,
    file_pdf_nama TEXT,
    dibuat_oleh TEXT DEFAULT 'Admin',
    prioritas TEXT DEFAULT 'normal',
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel Galeri Foto Kegiatan (adnan_Galeri)
CREATE TABLE IF NOT EXISTS public."adnan_Galeri" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    arisan_id UUID,
    judul TEXT,
    judul_kegiatan TEXT,
    tanggal_kegiatan DATE DEFAULT CURRENT_DATE,
    lokasi TEXT,
    deskripsi TEXT,
    foto_url TEXT NOT NULL,
    diunggah_oleh TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Berikan hak akses (GRANT) untuk seluruh tabel di schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 10. Aktifkan RLS & Kebijakan Akses Publik (anon & authenticated) untuk semua tabel
DO $$
DECLARE
    tbl TEXT;
    chk RECORD;
BEGIN
    -- Hapus seluruh CHECK constraint yang membatasi nilai jenis_bayar, metode_bayar, status, atau kategori
    FOR chk IN
        SELECT con.conname, rel.relname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname IN ('adnan_Pembayaran', 'adnan_Pengeluaran', 'adnan_Pengumuman', 'adnan_Arisan', 'adnan_PeriodeArisan')
          AND con.contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', chk.relname, chk.conname);
    END LOOP;

    FOREACH tbl IN ARRAY ARRAY[
        'adnan_User',
        'adnan_DataAnggota',
        'adnan_Arisan',
        'adnan_PeriodeArisan',
        'adnan_GroupArisan',
        'adnan_PemenangArisan',
        'adnan_Pembayaran',
        'adnan_Pengeluaran',
        'adnan_Pengumuman',
        'adnan_Galeri'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all select %1$s" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all select %1$s" ON public.%1$I FOR SELECT TO anon, authenticated USING (true);', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all insert %1$s" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all insert %1$s" ON public.%1$I FOR INSERT TO anon, authenticated WITH CHECK (true);', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all update %1$s" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all update %1$s" ON public.%1$I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all delete %1$s" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all delete %1$s" ON public.%1$I FOR DELETE TO anon, authenticated USING (true);', tbl);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
