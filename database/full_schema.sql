-- ============================================================
-- Streamit / NicholMovies Complete Database Schema
-- Generated from codebase analysis on 2026-05-01
-- 
-- Run this in Supabase SQL Editor to create all required
-- tables, indexes, functions, triggers, and RLS policies.
-- ============================================================

-- --------------------------------------------------------
-- Extensions
-- --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- Shared Function: Auto-update updated_at timestamp
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CONTENT TABLES
-- ============================================================

-- --------------------------------------------------------
-- VJs (Video Jockeys / Translators)
-- Referenced by: movies.vj_id, series.vj_id
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS vjs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Genres
-- Referenced by: movies.genre_ids, series.genre_ids
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tmdb_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Movies
-- Used by: lib/api.ts, panel movies CRUD, home page
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    release_date DATE,
    cover_image_url TEXT,
    thumbnail_url TEXT,
    trailer_url TEXT,
    video_url TEXT,
    videolink_url TEXT,
    genre_ids UUID[] DEFAULT '{}',
    duration INTEGER,
    published BOOLEAN DEFAULT false,
    premium BOOLEAN DEFAULT false,
    recommend BOOLEAN DEFAULT false,
    popular BOOLEAN DEFAULT false,
    latest BOOLEAN DEFAULT false,
    remakes BOOLEAN DEFAULT false,
    exclusive_from_kilax_movies BOOLEAN DEFAULT false,
    category TEXT,
    vj_id UUID REFERENCES vjs(id) ON DELETE SET NULL,
    tmdb_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Series
-- Used by: lib/api.ts, panel series CRUD, home page
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    release_date DATE,
    cover_image_url TEXT,
    thumbnail_url TEXT,
    trailer_url TEXT,
    genre_ids UUID[] DEFAULT '{}',
    published BOOLEAN DEFAULT false,
    recommend BOOLEAN DEFAULT false,
    popular BOOLEAN DEFAULT false,
    latest BOOLEAN DEFAULT false,
    remakes BOOLEAN DEFAULT false,
    exclusive_from_kilax BOOLEAN DEFAULT false,
    category TEXT,
    vj_id UUID REFERENCES vjs(id) ON DELETE SET NULL,
    tmdb_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Seasons
-- Parent: series (CASCADE delete)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    published BOOLEAN DEFAULT false,
    episode_count INTEGER DEFAULT 0,
    overview TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Episodes
-- Parent: seasons (CASCADE delete)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    episode_number INTEGER NOT NULL,
    video_url TEXT,
    videolink_url TEXT,
    published BOOLEAN DEFAULT false,
    premium BOOLEAN DEFAULT false,
    duration INTEGER,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================================
-- USER & AUTH TABLES
-- ============================================================

-- --------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- Used by: subscriptions, payment flows, user management
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    notifications_enabled BOOLEAN DEFAULT true,
    favorite_vjs UUID[] DEFAULT '{}',
    favorite_genres UUID[] DEFAULT '{}',
    favorite_actors TEXT[] DEFAULT '{}',
    subscription TEXT,
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Admins (panel access control)
-- Used by: panel/app/login/LoginForm.tsx
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================================
-- SUBSCRIPTION & PAYMENT TABLES
-- ============================================================

-- --------------------------------------------------------
-- Subscription Plans
-- Used by: lib/subscriptions.ts, payment page, panel
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    duration TEXT,
    duration_in_months INTEGER,
    duration_in_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Subscriptions (payment records)
-- Used by: lib/subscriptions.ts, makypay.ts, yopayments.ts
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    payment_method TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- MakyPay Transactions
-- Used by: lib/makypay.ts, api/makypay/* routes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS makypay_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Transaction identifiers
    uuid VARCHAR(255) NOT NULL UNIQUE,        -- MakyPay transaction UUID
    reference VARCHAR(255) NOT NULL UNIQUE,    -- Custom UUID v4 for idempotency
    provider_reference VARCHAR(255),           -- MTN/Airtel transaction ID
    -- Transaction details
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'UGX',
    phone_number VARCHAR(20),                  -- For mobile money transactions
    provider VARCHAR(50) NOT NULL,             -- mtn, airtel, card payments
    status VARCHAR(50) NOT NULL,               -- processing, completed, failed
    description TEXT,
    -- Card payment specific
    redirect_url TEXT,                         -- Redirect URL for card payments
    -- Error tracking
    error_message TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for makypay_transactions
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_user_id ON makypay_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_uuid ON makypay_transactions(uuid);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_reference ON makypay_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_status ON makypay_transactions(status);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_created_at ON makypay_transactions(created_at DESC);

-- Auto-update trigger
CREATE TRIGGER trigger_update_makypay_transactions_updated_at
    BEFORE UPDATE ON makypay_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- YoPayments Transactions (legacy, disabled but preserved)
-- Used by: lib/yopayments.ts, supabase/functions/yopayments-webhook
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS yopayments_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    internal_reference VARCHAR(255) NOT NULL UNIQUE,
    transaction_reference VARCHAR(255),
    mno_transaction_reference VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'UGX',
    phone_number VARCHAR(20),
    account_provider_code VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    description TEXT,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Auto-update trigger
CREATE TRIGGER trigger_update_yopayments_transactions_updated_at
    BEFORE UPDATE ON yopayments_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

-- --------------------------------------------------------
-- Notifications (admin push notifications)
-- Used by: panel/app/(pages)/notifications/page.tsx
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Auto-update trigger
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles: Users can read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Allow insert on signup"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- admins: Only admins can read (for login check)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can check admin status"
    ON admins FOR SELECT
    USING (auth.uid() = user_id);

-- movies: Public read access for published content
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published movies"
    ON movies FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to movies"
    ON movies FOR ALL
    USING (true)
    WITH CHECK (true);

-- series: Public read access for published content
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published series"
    ON series FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to series"
    ON series FOR ALL
    USING (true)
    WITH CHECK (true);

-- seasons: Public read access
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons"
    ON seasons FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to seasons"
    ON seasons FOR ALL
    USING (true)
    WITH CHECK (true);

-- episodes: Public read access
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view episodes"
    ON episodes FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to episodes"
    ON episodes FOR ALL
    USING (true)
    WITH CHECK (true);

-- genres: Public read access
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view genres"
    ON genres FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to genres"
    ON genres FOR ALL
    USING (true)
    WITH CHECK (true);

-- vjs: Public read access
ALTER TABLE vjs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vjs"
    ON vjs FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to vjs"
    ON vjs FOR ALL
    USING (true)
    WITH CHECK (true);

-- plans: Public read access
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plans"
    ON plans FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to plans"
    ON plans FOR ALL
    USING (true)
    WITH CHECK (true);

-- subscriptions: Users can view their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (true);

-- makypay_transactions: Users can view their own
ALTER TABLE makypay_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own makypay transactions"
    ON makypay_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert makypay transactions"
    ON makypay_transactions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update makypay transactions"
    ON makypay_transactions FOR UPDATE
    USING (true);

-- yopayments_transactions: Users can view their own
ALTER TABLE yopayments_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own yopayments transactions"
    ON yopayments_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert yopayments transactions"
    ON yopayments_transactions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update yopayments transactions"
    ON yopayments_transactions FOR UPDATE
    USING (true);

-- notifications: Public read (for mobile app), service role write
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notifications"
    ON notifications FOR SELECT
    USING (true);

CREATE POLICY "Service role full access to notifications"
    ON notifications FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- TABLE COMMENTS
-- ============================================================
COMMENT ON TABLE vjs IS 'Video Jockeys / Translators who dub content';
COMMENT ON TABLE genres IS 'Movie and series genre categories (synced with TMDB)';
COMMENT ON TABLE movies IS 'Movie catalog with streaming URLs and metadata';
COMMENT ON TABLE series IS 'Series catalog with seasons/episodes hierarchy';
COMMENT ON TABLE seasons IS 'Seasons belonging to a series';
COMMENT ON TABLE episodes IS 'Individual episodes within a season';
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE admins IS 'Admin panel access whitelist';
COMMENT ON TABLE plans IS 'Subscription pricing plans (basic/standard tiers)';
COMMENT ON TABLE subscriptions IS 'Subscription payment records';
COMMENT ON TABLE makypay_transactions IS 'MakyPay mobile money and card payment transactions';
COMMENT ON TABLE yopayments_transactions IS 'YoPayments mobile money transactions (legacy)';
COMMENT ON TABLE notifications IS 'Admin push notifications for mobile app users';

COMMENT ON COLUMN movies.exclusive_from_kilax_movies IS 'NicholMovies exclusive content flag';
COMMENT ON COLUMN series.exclusive_from_kilax IS 'NicholMovies exclusive content flag';
COMMENT ON COLUMN makypay_transactions.uuid IS 'MakyPay transaction UUID returned from API';
COMMENT ON COLUMN makypay_transactions.reference IS 'Custom UUID v4 reference for idempotency';
COMMENT ON COLUMN makypay_transactions.provider_reference IS 'MTN/Airtel transaction reference ID';
COMMENT ON COLUMN makypay_transactions.provider IS 'Payment provider: mtn, airtel, or card payments';
COMMENT ON COLUMN makypay_transactions.status IS 'Transaction status: processing, completed, failed';
COMMENT ON COLUMN makypay_transactions.redirect_url IS 'Redirect URL for card payments';
