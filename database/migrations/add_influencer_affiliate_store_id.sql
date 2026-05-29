-- Add optional Amazon Associates Store ID for influencer affiliate settings.
-- Tracking ID remains stored in affiliate_code and is still the value used as Amazon's tag= parameter.
ALTER TABLE influencer_profiles
ADD COLUMN IF NOT EXISTS affiliate_store_id TEXT;

