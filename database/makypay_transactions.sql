-- MakyPay Transactions Table
-- Stores all MakyPay payment transactions for tracking and reconciliation

CREATE TABLE IF NOT EXISTS makypay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction identifiers
  uuid VARCHAR(255) NOT NULL UNIQUE, -- MakyPay transaction UUID
  reference VARCHAR(255) NOT NULL UNIQUE, -- Your custom reference (UUID v4)
  provider_reference VARCHAR(255), -- MTN/Airtel transaction ID
  
  -- Transaction details
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UGX',
  phone_number VARCHAR(20), -- For mobile money transactions
  provider VARCHAR(50) NOT NULL, -- mtn, airtel, card payments
  status VARCHAR(50) NOT NULL, -- processing, completed, failed
  description TEXT,
  
  -- Card payment specific
  redirect_url TEXT, -- For card payments
  
  -- Error tracking
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_user_id ON makypay_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_uuid ON makypay_transactions(uuid);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_reference ON makypay_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_status ON makypay_transactions(status);
CREATE INDEX IF NOT EXISTS idx_makypay_transactions_created_at ON makypay_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE makypay_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON makypay_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert transactions
CREATE POLICY "Service role can insert transactions"
  ON makypay_transactions
  FOR INSERT
  WITH CHECK (true);

-- Service role can update transactions
CREATE POLICY "Service role can update transactions"
  ON makypay_transactions
  FOR UPDATE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_makypay_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_makypay_transactions_updated_at
  BEFORE UPDATE ON makypay_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_makypay_transactions_updated_at();

-- Comments for documentation
COMMENT ON TABLE makypay_transactions IS 'Stores MakyPay payment transactions for mobile money and card payments';
COMMENT ON COLUMN makypay_transactions.uuid IS 'MakyPay transaction UUID returned from API';
COMMENT ON COLUMN makypay_transactions.reference IS 'Custom UUID v4 reference for idempotency';
COMMENT ON COLUMN makypay_transactions.provider_reference IS 'MTN/Airtel transaction reference ID';
COMMENT ON COLUMN makypay_transactions.provider IS 'Payment provider: mtn, airtel, or card payments';
COMMENT ON COLUMN makypay_transactions.status IS 'Transaction status: processing, completed, failed';
COMMENT ON COLUMN makypay_transactions.redirect_url IS 'Redirect URL for card payments';
