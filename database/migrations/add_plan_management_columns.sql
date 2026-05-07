-- ============================================================
-- Migration: Add dynamic plan management columns
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add recommended flag (only one plan should be recommended at a time)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS recommended BOOLEAN DEFAULT false;

-- Add sort order for display ordering
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add features list (array of feature strings like "HD Streaming", "Downloads")
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';

-- Add active/inactive toggle (inactive plans are hidden from payment page)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Comments
COMMENT ON COLUMN plans.recommended IS 'Whether this plan shows the "Recommended" badge on the payment page';
COMMENT ON COLUMN plans.sort_order IS 'Display order on the payment page (lower = first)';
COMMENT ON COLUMN plans.features IS 'List of plan features shown to users (e.g., "HD Streaming", "Downloads")';
COMMENT ON COLUMN plans.active IS 'Whether this plan is visible on the payment page';
