-- Enable Row Level Security (RLS) on tables that need protection
-- This migration enables RLS and creates policies for UserProfileImage, IdentityImage, TrackedLink, and LinkClick
-- 
-- Note: These policies protect against direct PostgREST API access.
-- The Next.js API routes use Prisma with service role credentials, which bypass RLS.
-- However, enabling RLS prevents unauthorized access via Supabase's PostgREST API.

-- ============================================
-- 1. UserProfileImage
-- ============================================
ALTER TABLE "UserProfileImage" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own profile images (matched by email)
CREATE POLICY "Users can view own profile images"
  ON "UserProfileImage"
  FOR SELECT
  USING (
    "userId" IN (
      SELECT id FROM "User" 
      WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
    )
  );

-- Policy: Users can insert their own profile images
CREATE POLICY "Users can insert own profile images"
  ON "UserProfileImage"
  FOR INSERT
  WITH CHECK (
    "userId" IN (
      SELECT id FROM "User" 
      WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
    )
  );

-- Policy: Users can update their own profile images
CREATE POLICY "Users can update own profile images"
  ON "UserProfileImage"
  FOR UPDATE
  USING (
    "userId" IN (
      SELECT id FROM "User" 
      WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
    )
  );

-- Policy: Users can delete their own profile images
CREATE POLICY "Users can delete own profile images"
  ON "UserProfileImage"
  FOR DELETE
  USING (
    "userId" IN (
      SELECT id FROM "User" 
      WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
    )
  );

-- ============================================
-- 2. IdentityImage
-- ============================================
ALTER TABLE "IdentityImage" ENABLE ROW LEVEL SECURITY;

-- Policy: Influencers can view their own identity images
CREATE POLICY "Influencers can view own identity images"
  ON "IdentityImage"
  FOR SELECT
  USING (
    "influencerProfileId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- Policy: Influencers can insert their own identity images
CREATE POLICY "Influencers can insert own identity images"
  ON "IdentityImage"
  FOR INSERT
  WITH CHECK (
    "influencerProfileId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- Policy: Influencers can update their own identity images
CREATE POLICY "Influencers can update own identity images"
  ON "IdentityImage"
  FOR UPDATE
  USING (
    "influencerProfileId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- Policy: Influencers can delete their own identity images
CREATE POLICY "Influencers can delete own identity images"
  ON "IdentityImage"
  FOR DELETE
  USING (
    "influencerProfileId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- ============================================
-- 3. TrackedLink
-- ============================================
ALTER TABLE "TrackedLink" ENABLE ROW LEVEL SECURITY;

-- Policy: Influencers can view their own tracked links
CREATE POLICY "Influencers can view own tracked links"
  ON "TrackedLink"
  FOR SELECT
  USING (
    "influencerId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- Policy: Public read access for link redirects (by linkCode)
-- This allows the redirect functionality to work via PostgREST API
-- Note: The Next.js API routes use Prisma/service role which bypasses RLS,
-- but this policy allows public PostgREST access for redirects if needed
CREATE POLICY "Public can read active tracked links by code"
  ON "TrackedLink"
  FOR SELECT
  USING ("isActive" = true);

-- Policy: Influencers can insert their own tracked links
CREATE POLICY "Influencers can insert own tracked links"
  ON "TrackedLink"
  FOR INSERT
  WITH CHECK (
    "influencerId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- Policy: Influencers can update their own tracked links
CREATE POLICY "Influencers can update own tracked links"
  ON "TrackedLink"
  FOR UPDATE
  USING (
    "influencerId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- Policy: Influencers can delete their own tracked links
CREATE POLICY "Influencers can delete own tracked links"
  ON "TrackedLink"
  FOR DELETE
  USING (
    "influencerId" IN (
      SELECT id FROM "InfluencerProfile"
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
      )
    )
  );

-- ============================================
-- 4. LinkClick
-- ============================================
ALTER TABLE "LinkClick" ENABLE ROW LEVEL SECURITY;

-- Policy: Influencers can view clicks for their own tracked links
CREATE POLICY "Influencers can view own link clicks"
  ON "LinkClick"
  FOR SELECT
  USING (
    "trackedLinkId" IN (
      SELECT id FROM "TrackedLink"
      WHERE "influencerId" IN (
        SELECT id FROM "InfluencerProfile"
        WHERE "userId" IN (
          SELECT id FROM "User" 
          WHERE LOWER(TRIM(email)) = LOWER(TRIM((auth.jwt() ->> 'email')))
        )
      )
    )
  );

-- Policy: Public can insert link clicks (for tracking)
-- This allows the redirect functionality to record clicks via PostgREST API
-- Note: The Next.js API routes use Prisma/service role which bypasses RLS,
-- but this policy allows public PostgREST access if needed
CREATE POLICY "Public can insert link clicks"
  ON "LinkClick"
  FOR INSERT
  WITH CHECK (true);

-- Note: No UPDATE or DELETE policies for LinkClick
-- Click records should be immutable - only service role (via Prisma) can modify them

