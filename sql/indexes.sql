CREATE INDEX IF NOT EXISTS idx_barangays_geom_gist
    ON barangays USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_barangays_centroid_gist
    ON barangays USING GIST (centroid);

CREATE INDEX IF NOT EXISTS idx_barangays_search_text_tsv_gin
    ON barangays USING GIN (to_tsvector('simple', search_text));

CREATE INDEX IF NOT EXISTS idx_barangays_municipality_psgc_code_btree
    ON barangays USING BTREE (municipality_psgc_code);
