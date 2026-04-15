const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
-- Create affiliate_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.affiliate_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  influencer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  tracked_link_id UUID REFERENCES public.tracked_links(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'click', 'purchase', 'conversion'
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'INR',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_events_influencer ON public.affiliate_events(influencer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_product ON public.affiliate_events(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_tracked_link ON public.affiliate_events(tracked_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_event_type ON public.affiliate_events(event_type);

-- Enable RLS
ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;

-- Simple policy for influencer access
CREATE POLICY IF NOT EXISTS "Influencers can see their own events" 
  ON public.affiliate_events FOR SELECT 
  TO authenticated
  USING (auth.uid() = influencer_id);
`;

async function runMigration() {
    console.log('Running migration to create affiliate_events...');
    const { data, error } = await supabase.rpc('execute_sql', { sql });

    if (error) {
        console.error('Migration failed:', error.message);
        console.log('\nPlease run the following SQL manually in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('Migration completed successfully. affiliate_events table created.');
    }
}

runMigration();
