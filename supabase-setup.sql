-- =============================================
-- SUPABASE DATABASE SETUP
-- Chạy script này trong Supabase SQL Editor
-- =============================================

-- 1. Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    qr_image TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng spin_results
CREATE TABLE IF NOT EXISTS spin_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL UNIQUE,
    prize_name TEXT NOT NULL,
    prize_value INTEGER NOT NULL,
    prize_emoji TEXT DEFAULT '🧧',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_results ENABLE ROW LEVEL SECURITY;

-- 4. Tạo policies cho phép đọc/ghi (public access cho demo)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on spin_results" ON spin_results
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Tạo index để tăng performance
CREATE INDEX IF NOT EXISTS idx_spin_results_user_id ON spin_results(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_results_created_at ON spin_results(created_at DESC);

-- =============================================
-- STORAGE SETUP (Làm trong Supabase Dashboard)
-- =============================================
-- 1. Vào Storage > Create new bucket
-- 2. Tên bucket: qr-images
-- 3. Chọn "Public bucket" = ON
-- 4. Click Create bucket
-- 
-- Hoặc chạy SQL này:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('qr-images', 'qr-images', true);
