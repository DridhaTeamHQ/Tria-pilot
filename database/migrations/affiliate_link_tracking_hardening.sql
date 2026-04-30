-- Hardening migration for affiliate link generation and click tracking
-- Run this in Supabase SQL Editor after confirming there are no duplicate
-- (influencer_id, product_id) rows in public.tracked_links.

-- 1. Re-sync aggregate click counts from raw click rows
UPDATE public.tracked_links tl
SET click_count = counts.total_clicks
FROM (
  SELECT
    tracked_link_id,
    COUNT(*)::integer AS total_clicks
  FROM public.link_clicks
  GROUP BY tracked_link_id
) counts
WHERE counts.tracked_link_id = tl.id;

UPDATE public.tracked_links
SET click_count = 0
WHERE id NOT IN (
  SELECT DISTINCT tracked_link_id
  FROM public.link_clicks
  WHERE tracked_link_id IS NOT NULL
);

-- 2. Enforce one tracked link per influencer/product pair
CREATE UNIQUE INDEX IF NOT EXISTS tracked_links_influencer_product_unique
ON public.tracked_links(influencer_id, product_id)
WHERE influencer_id IS NOT NULL
  AND product_id IS NOT NULL;

-- 3. Keep the legacy RPC available, but align it to the lowercase schema
CREATE OR REPLACE FUNCTION public.increment_click_count(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tracked_links
  SET click_count = click_count + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
