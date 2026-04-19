# SQL

`schema.sql` defines the raw staging tables plus the canonical `municipalities` and `barangays` tables used by the app.

`indexes.sql` defines the GIST, GIN, and lookup indexes required for spatial queries, filtered municipality loads, and ranked barangay search.
