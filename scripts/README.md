# Scripts

Database preparation now follows one canonical flow:

- `npm run db:import-psgc` loads Iloilo PSGC coverage into `psgc_admin_staging`
- `npm run db:import-boundaries` loads matched barangay geometry into `barangay_boundary_staging`
- `npm run db:build-search-index` materializes canonical `municipalities` and `barangays`
- `npm run db:validate-data` runs the required geometry and count checks
- `npm run db:prepare` runs the full sequence end to end
