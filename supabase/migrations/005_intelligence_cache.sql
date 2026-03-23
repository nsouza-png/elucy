-- Intelligence Cache — stores pre-computed Databricks query results
-- The cockpit reads from here via REST API (no Databricks proxy needed)

CREATE TABLE IF NOT EXISTS public.intelligence_cache (
  query_id TEXT PRIMARY KEY,            -- ex: 'funil', 'totais', 'sdr', 'closer', etc.
  data JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of row arrays (same format as Databricks data_array)
  columns JSONB DEFAULT '[]'::jsonb,    -- column names for reference
  row_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow read with anon key (cockpit is public GitHub Pages)
ALTER TABLE public.intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.intelligence_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role write" ON public.intelligence_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Grant select to anon and authenticated roles
GRANT SELECT ON public.intelligence_cache TO anon;
GRANT SELECT ON public.intelligence_cache TO authenticated;
GRANT ALL ON public.intelligence_cache TO service_role;

COMMENT ON TABLE public.intelligence_cache IS 'Pre-computed intelligence queries from Databricks, synced periodically. Cockpit reads directly via REST API.';
