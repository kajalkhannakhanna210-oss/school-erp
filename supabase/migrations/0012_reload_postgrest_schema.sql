-- Refresh PostgREST's schema cache after the remote migration history and
-- exposed REST schema became out of sync.
notify pgrst, 'reload schema';
