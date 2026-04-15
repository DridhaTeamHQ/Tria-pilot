const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    console.log('Connecting to PostgreSQL...');
    const client = new Client({
        connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected. Running Migration...');

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

        -- Create policy (if not exists is harder in SQL for policies, so we check first or just use a DO block)
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'affiliate_events' AND policyname = 'Influencers can see their own events'
            ) THEN
                CREATE POLICY "Influencers can see their own events" 
                ON public.affiliate_events FOR SELECT 
                TO authenticated
                USING (auth.uid() = influencer_id);
            END IF;
        END
        $$;
        `;

        await client.query(sql);
        console.log('Migration completed successfully. affiliate_events table created.');

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
