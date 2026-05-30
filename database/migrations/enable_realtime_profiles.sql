-- Enable Realtime for profiles table
-- This allows clients to receive instant updates when subscription data changes

-- Add profiles table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Verify the table is added to realtime
-- You can check this in Supabase Dashboard → Database → Replication
-- The profiles table should show "Realtime enabled"

-- Note: If you get an error that the table is already in the publication,
-- that's fine - it means Realtime is already enabled for this table.
