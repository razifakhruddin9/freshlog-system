-- ==============================================================================
-- SKRIP SKEMA DATABASE SUPABASE (POSTGRESQL) - FRESHLOG SISTEM INVENTARIS FEFO
-- ==============================================================================
-- Petunjuk:
-- 1. Buka dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Masuk ke menu "SQL Editor"
-- 3. Klik "New Query", paste skrip ini seluruhnya, lalu klik tombol "Run".
-- ==============================================================================

-- 1. TABEL BATCH INVENTARIS (STOK FISIK & EXPIRED DATE)
CREATE TABLE IF NOT EXISTS public.batch (
    batch_id TEXT PRIMARY KEY,
    produk TEXT NOT NULL,
    sisa_stok NUMERIC NOT NULL DEFAULT 0,
    tanggal_kedaluwarsa DATE NOT NULL,
    kategori TEXT DEFAULT 'Makanan Fresh',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom lengkap jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.batch ADD COLUMN IF NOT EXISTS kategori TEXT DEFAULT 'Makanan Fresh';
ALTER TABLE public.batch ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.batch ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index pencarian batch
CREATE INDEX IF NOT EXISTS idx_batch_produk ON public.batch (produk);
CREATE INDEX IF NOT EXISTS idx_batch_exp ON public.batch (tanggal_kedaluwarsa);

-- 2. TABEL MASTER PRODUK
CREATE TABLE IF NOT EXISTS public.products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Makanan Fresh',
    buy_price NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pencarian produk
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);

-- 3. TABEL RIWAYAT TRANSAKSI PEMBELIAN (BARANG MASUK)
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY,
    pemasok TEXT NOT NULL,
    waktu TIMESTAMPTZ DEFAULT NOW(),
    total_biaya NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pencarian pembelian
CREATE INDEX IF NOT EXISTS idx_purchases_pemasok ON public.purchases (pemasok);
CREATE INDEX IF NOT EXISTS idx_purchases_waktu ON public.purchases (waktu);

-- 4. TABEL RIWAYAT TRANSAKSI PENJUALAN (KASIR / BARANG KELUAR)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    waktu TIMESTAMPTZ DEFAULT NOW(),
    kasir TEXT DEFAULT 'Admin Toko',
    pelanggan TEXT DEFAULT 'Pelanggan Umum',
    total_pendapatan NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    alokasi_batch JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pencarian penjualan
CREATE INDEX IF NOT EXISTS idx_sales_waktu ON public.sales (waktu);
CREATE INDEX IF NOT EXISTS idx_sales_kasir ON public.sales (kasir);

-- 5. TABEL PENGGUNA SISTEM (ADMIN & STAF)
CREATE TABLE IF NOT EXISTS public.users (
    username TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    label_role TEXT DEFAULT 'Staf',
    shift TEXT DEFAULT '-',
    telepon TEXT DEFAULT '',
    email TEXT DEFAULT '',
    password TEXT NOT NULL DEFAULT '123',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- KEAMANAN & AKSES ROW LEVEL SECURITY (RLS)
-- Diaktifkan dengan policy akses anon (bisa disesuaikan dengan key auth Supabase)
-- ==============================================================================

ALTER TABLE public.batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Buat policy akses penuh untuk role anon & authenticated
DROP POLICY IF EXISTS "Anon CRUD Batch" ON public.batch;
CREATE POLICY "Anon CRUD Batch" ON public.batch FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon CRUD Products" ON public.products;
CREATE POLICY "Anon CRUD Products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon CRUD Purchases" ON public.purchases;
CREATE POLICY "Anon CRUD Purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon CRUD Sales" ON public.sales;
CREATE POLICY "Anon CRUD Sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon CRUD Users" ON public.users;
CREATE POLICY "Anon CRUD Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED DATA AWAL (OPTIONAL)
-- ==============================================================================
INSERT INTO public.users (username, nama, role, label_role, shift, telepon, email, password)
VALUES 
    ('admin', 'Admin Toko', 'admin', 'Admin', '07.00 - 22.00 WIB', '0812-3456-7890', 'admin@freshlog.id', '123'),
    ('staf1', 'Budi (Staf 1)', 'staff', 'Staf 1', '07.00 - 14.30 WIB', '0813-1111-2222', 'budi@freshlog.id', '123')
ON CONFLICT (username) DO NOTHING;

