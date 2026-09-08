-- Enable fuzzy text matching for duplicate analysis. IF NOT EXISTS makes this
-- forward migration safe for databases where the former unjournaled SQL was
-- applied manually, while the journal entry makes empty-database replay complete.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
