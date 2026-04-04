-- Enable pg_trgm extension for fuzzy text matching
-- This extension provides similarity() function for duplicate detection

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';
