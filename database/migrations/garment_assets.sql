-- =====================================================
-- GARMENT ASSETS TABLE (Canonical, deduplicated)
-- Run this in Supabase SQL Editor
-- =====================================================
--
-- PURPOSE: Store extracted garment images and metadata ONCE and reuse across
-- users and influencers. Deduplication via image_hash reduces API costs by
-- avoiding repeated extraction/generation for the same clothing image.
--
-- IMMUTABILITY: Garments are treated as immutable assets. Do not UPDATE
-- existing rows; only INSERT new ones when hash is not found.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.garments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT,
  -- Deterministic hash (e.g. SHA-256) of source image; used for deduplication.
  -- Unique constraint ensures we never store the same garment twice.
  image_hash TEXT NOT NULL,
  -- URL of the clean/extracted garment image (storage or CDN).
  clean_garment_image_url TEXT NOT NULL,
  -- Original source image URL (for audit/debug).
  source_image_url TEXT NOT NULL,
  -- Structured metadata (e.g. garment type, color, fit) from extraction.
  garment_metadata JSONB DEFAULT '{}',
  -- Whether this asset has been verified for quality/reuse.
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplication: one canonical record per image hash.
CREATE UNIQUE INDEX IF NOT EXISTS idx_garments_image_hash_unique
  ON public.garments (image_hash);

-- Fast lookup by hash (e.g. before creating or reusing).
CREATE INDEX IF NOT EXISTS idx_garments_image_hash
  ON public.garments (image_hash);

-- Fast lookup by product (e.g. list garments for a product).
CREATE INDEX IF NOT EXISTS idx_garments_product_id
  ON public.garments (product_id)
  WHERE product_id IS NOT NULL;

-- Optional: speed up "verified" filters if used in listings.
CREATE INDEX IF NOT EXISTS idx_garments_verified
  ON public.garments (verified)
  WHERE verified = true;

COMMENT ON TABLE public.garments IS
  'Canonical garment assets. Deduplicated by image_hash to control API costs; garments are immutable.';

COMMENT ON COLUMN public.garments.image_hash IS
  'SHA-256 (or similar) hash of source image; used for deduplication.';

COMMENT ON COLUMN public.garments.garment_metadata IS
  'Structured extraction output (e.g. type, color, fit).';

-- RLS: allow authenticated reads (app lookups); inserts/updates via service role only.
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read garments"
  ON public.garments
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role is used for INSERT in createGarmentIfNotExists (bypasses RLS).
-- No UPDATE policy: garments are immutable; avoid accidental overwrites.
