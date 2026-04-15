-- Migration to add revenue tracking to affiliate system
-- Run this in Supabase SQL Editor

-- 1. Add amount and tracked_link_id to affiliate_events
ALTER TABLE public.affiliate_events 
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tracked_link_id UUID REFERENCES public.tracked_links(id) ON DELETE SET NULL;

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_events_tracked_link ON public.affiliate_events(tracked_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_influencer ON public.affiliate_events(influencer_id);

-- 3. Update increment_click_count RPC to be more robust
CREATE OR REPLACE FUNCTION public.increment_click_count(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tracked_links
  SET click_count = click_count + 1,
      updated_at = NOW()
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
