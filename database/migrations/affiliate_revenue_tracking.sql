-- Migration to align affiliate revenue tracking with the lowercase tracking schema
-- Run this in Supabase SQL Editor

-- 1. Create the lowercase affiliate_events table used by the current app routes
CREATE TABLE IF NOT EXISTS public.affiliate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  tracked_link_id UUID REFERENCES public.tracked_links(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ensure the table has the columns expected by the current backend code
ALTER TABLE public.affiliate_events
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tracked_link_id UUID REFERENCES public.tracked_links(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_events_tracked_link ON public.affiliate_events(tracked_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_influencer ON public.affiliate_events(influencer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_product ON public.affiliate_events(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_type ON public.affiliate_events(event_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_created_at ON public.affiliate_events(created_at);

-- 4. Backfill lowercase affiliate_events from legacy PascalCase rows where possible.
-- We only migrate rows that already have a tracked_link_id, because those can be mapped
-- cleanly to the lowercase influencer_id and product_id values used in the live app.
INSERT INTO public.affiliate_events (
  influencer_id,
  product_id,
  tracked_link_id,
  event_type,
  amount,
  currency,
  metadata,
  created_at
)
SELECT
  tl.influencer_id,
  tl.product_id,
  ae.tracked_link_id,
  LOWER(COALESCE(ae."eventType", 'purchase')),
  COALESCE(ae.amount, NULLIF(ae.metadata ->> 'amount', '')::DECIMAL(10, 2)),
  COALESCE(ae.currency, NULLIF(ae.metadata ->> 'currency', ''), 'INR'),
  COALESCE(ae.metadata, '{}'::jsonb) || jsonb_build_object(
    'legacy_affiliate_event_id', ae.id,
    'migrated_from', 'AffiliateEvent'
  ),
  COALESCE(ae."createdAt"::timestamptz, NOW())
FROM public."AffiliateEvent" ae
JOIN public.tracked_links tl
  ON tl.id = ae.tracked_link_id
WHERE ae.tracked_link_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.affiliate_events new_ae
    WHERE new_ae.metadata ->> 'legacy_affiliate_event_id' = ae.id
  );

-- 5. Keep the click count RPC aligned with the lowercase tracked_links table
CREATE OR REPLACE FUNCTION public.increment_click_count(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tracked_links
  SET click_count = click_count + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
