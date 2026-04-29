-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- VJS Table
-- --------------------------------------------------------
CREATE TABLE vjs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Genres Table
-- --------------------------------------------------------
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tmdb_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Movies Table
-- --------------------------------------------------------
CREATE TABLE movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    release_date DATE,
    cover_image_url TEXT,
    trailer_url TEXT,
    genre_ids UUID[] DEFAULT '{}',
    duration INTEGER,
    published BOOLEAN DEFAULT false,
    premium BOOLEAN DEFAULT false,
    recommend BOOLEAN DEFAULT false,
    popular BOOLEAN DEFAULT false,
    latest BOOLEAN DEFAULT false,
    vj_id UUID REFERENCES vjs(id) ON DELETE SET NULL,
    videolink_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    tmdb_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Series Table
-- --------------------------------------------------------
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    release_date DATE,
    cover_image_url TEXT,
    vj_id UUID REFERENCES vjs(id) ON DELETE SET NULL,
    genre_ids UUID[] DEFAULT '{}',
    published BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    trailer_url TEXT,
    tmdb_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Seasons Table
-- --------------------------------------------------------
CREATE TABLE seasons (
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
-- Episodes Table
-- --------------------------------------------------------
CREATE TABLE episodes (
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

-- --------------------------------------------------------
-- Profiles Table
-- --------------------------------------------------------
-- Note: auth.users is native to Supabase. This references it.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    notifications_enabled BOOLEAN DEFAULT true,
    favorite_vjs UUID[] DEFAULT '{}',
    favorite_genres UUID[] DEFAULT '{}',
    favorite_actors TEXT[] DEFAULT '{}',
    email TEXT,
    subscription TEXT,
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- Subscription Plans Table
-- --------------------------------------------------------
CREATE TABLE plans (
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
-- Subscriptions Table
-- --------------------------------------------------------
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    payment_method TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- MakyPay Transactions Table
-- --------------------------------------------------------
CREATE TABLE makypay_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uuid VARCHAR(255) NOT NULL UNIQUE,
    reference VARCHAR(255) NOT NULL UNIQUE,
    provider_reference VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'UGX',
    phone_number VARCHAR(20),
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    redirect_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TRIGGER trigger_update_makypay_transactions_updated_at
    BEFORE UPDATE ON makypay_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- YoPayments Transactions Table
-- --------------------------------------------------------
CREATE TABLE yopayments_transactions (
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

CREATE TRIGGER trigger_update_yopayments_transactions_updated_at
    BEFORE UPDATE ON yopayments_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
