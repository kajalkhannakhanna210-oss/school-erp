-- Enable live INSERT notifications for the enquiries directory.
-- The client still refreshes through the authorized server API before showing
-- a row or notification, so Realtime is only a signal and not authorization.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'enquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries;
  END IF;
END
$$;
