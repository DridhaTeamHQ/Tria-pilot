-- Enable Supabase Realtime on messaging-related tables.
--
-- WHY THIS IS NEEDED:
-- Supabase Realtime broadcasts postgres_changes ONLY for tables that have
-- been explicitly added to the `supabase_realtime` publication. By default,
-- new tables are NOT in this publication, so even though our app subscribes
-- to INSERT events on `messages` and `conversations`, no events fire until
-- the publication is updated.
--
-- Symptom before this migration: brand sends a message, the row is written
-- to Postgres successfully, but the influencer's browser never receives the
-- realtime payload — they have to refresh to see the new message.
--
-- HOW TO APPLY:
-- 1. Open the Supabase dashboard → SQL Editor
-- 2. Paste this entire file and click Run.
-- (Or apply via your normal migration tooling.)
--
-- This is idempotent: re-running is safe.

DO $$
BEGIN
  -- Add `messages` to the realtime publication if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  -- Add `conversations` to the realtime publication if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;

  -- Add `notifications` too — bell badge already polls but realtime is faster
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

-- For postgres_changes UPDATE/DELETE payloads to include the OLD row, the
-- table needs REPLICA IDENTITY FULL. Without this, UPDATE events arrive
-- with only the primary key in `old`, which breaks delta-style filters.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
