1. Goal

Build a web app where a user can:

search for a barangay in Iloilo
see its boundary on the map
filter by municipality/city
click a boundary to view details
optionally see nearby/adjacent barangays later

Using Iloilo-only scope is a good choice because PSA’s current provincial summary shows Iloilo Province has 1,721 barangays, and the City of Iloilo has 180 barangays.
## 1. Goal

Build a web app where a user can:

- search for a barangay in Iloilo
- see its boundary on the map
- filter by municipality/city
- click a boundary to view details
- optionally see nearby/adjacent barangays later

Using Iloilo-only scope is a good choice because PSA’s current provincial summary shows Iloilo Province has 1,721 barangays, and the City of Iloilo has 180 barangays.

## 2. Recommended stack

### Frontend

- Next.js
- TypeScript
- MapLibre GL JS
- Tailwind or simple CSS

MapLibre GL JS is a WebGL map library for rendering interactive maps, including vector tile workflows.

### Backend

- Next.js API routes or Express/Fastify
- PostgreSQL + PostGIS

PostGIS adds spatial types and spatial query functions to PostgreSQL, including relationships like ST_Intersects and ST_Touches.

### Data

- PSGC master data for official names and codes
- Barangay boundary dataset clipped to Iloilo only

PSA publishes PSGC public data files and summaries as of 31 March 2026, with recent PSGC changes released on 13 April 2026.

## 3. Scope definition

### Phase 1 scope

Only support:

- Iloilo Province
- Iloilo City
- barangay search
- barangay boundary display
- municipality/city filter
- details panel

### Out of scope for MVP

Do not build these yet:

- route directions
- land lot ownership
- editing polygons
- offline maps
- crowdsourced changes
- demographic dashboards
- full Philippines support

This keeps the first version fast and manageable.

## 4. Core user flows

### User flow A: Search

1. User types barangay name
2. App shows matching barangays in Iloilo
3. User selects one
4. Map zooms to the barangay polygon
5. Details panel opens

### User flow B: Browse by municipality

1. User picks a municipality or Iloilo City
2. App loads barangays for that area
3. User clicks a barangay on the map
4. Boundary is highlighted
5. Metadata is shown

### User flow C: Deep link

1. User opens a URL like `/barangay/0630xxxxxxx`
2. App loads that barangay directly
3. Map centers on it

## 5. Data model

You need two kinds of data:

A. Official admin/index data

Use PSGC as the source of truth for:

- region code
- province code
- municipality/city code
- barangay code
- official names

This is important because many barangays can share similar names, so the real identifier should be the PSGC code, not the display name. PSA’s PSGC publication datafile is the canonical source for this structure.

B. Spatial boundary data

Use a barangay boundary dataset, but clip/store only:

- Iloilo Province
- Iloilo City

You should assume the official code list is more current than some public boundary layers, because PSA’s PSGC updates keep changing names and units over time.

## 6. Database design

Table: municipalities

- id uuid pk
- psgc_code varchar(10) unique not null
- name text not null
- province_name text not null
- type text not null -- municipality or city
- geom geometry(MultiPolygon, 4326) null
- created_at timestamp
- updated_at timestamp

Table: barangays

- id uuid pk
- psgc_code varchar(10) unique not null
- name text not null
- display_name text not null
- municipality_psgc_code varchar(10) not null
- municipality_name text not null
- province_name text not null
- region_name text not null
- geom geometry(MultiPolygon, 4326) not null
- centroid geometry(Point, 4326) not null
- bbox geometry(Polygon, 4326) null
- search_text text
- created_at timestamp
- updated_at timestamp

Suggested indexes

```sql
create index idx_barangays_geom on barangays using gist (geom);
create index idx_barangays_centroid on barangays using gist (centroid);
create index idx_barangays_name on barangays using gin (to_tsvector('simple', search_text));
create index idx_barangays_municipality on barangays (municipality_psgc_code);
```

Why this matters

- spatial index speeds map queries
- text index speeds barangay search
- centroid helps quick map previews and labels

## 7. Data pipeline

### Step 1: Download PSGC data

Pull the latest PSGC publication datafile and provincial summary from PSA. Those files are published for 1Q 2026 and include provincial/admin counts and code hierarchy.

### Step 2: Filter to Iloilo only

From PSGC:

- keep Iloilo Province entries
- keep Iloilo City entries
- keep all linked barangays

### Step 3: Get boundary data

Obtain barangay boundary polygons from your chosen source.

### Step 4: Normalize fields

Standardize:

- official PSGC code
- official barangay name
- municipality name
- province name

Add:

- display_name = "{barangay}, {municipality}, Iloilo"

### Step 5: Validate joins

Match every geometry row to a PSGC row by code if available, otherwise by careful name matching.

### Step 6: Generate derived geometry fields

Use PostGIS to generate:

- centroid
- bounding box
- simplified geometry for lighter rendering

### Step 7: Load into PostGIS

Import shapefile/GeoJSON into PostgreSQL using:

- ogr2ogr
- shp2pgsql
- or a Node/Python ETL script

## 8. API design

`GET /api/municipalities`

Returns all Iloilo municipalities/cities.

Example:

```json
[
  { "psgcCode": "0630...", "name": "Oton", "type": "municipality" },
  { "psgcCode": "0631...", "name": "City of Iloilo", "type": "city" }
]
```

`GET /api/barangays/search?q=...`

Returns search matches.

Example:

```json
[
  {
    "psgcCode": "0630...",
    "name": "San Jose",
    "displayName": "San Jose, Oton, Iloilo",
    "municipalityName": "Oton"
  }
]
```

`GET /api/barangays?municipality=0630...`

Returns barangays for one municipality.

`GET /api/barangays/:psgcCode`

Returns metadata and geometry or geometry URL.

`GET /api/barangays/:psgcCode/neighbors`

Later feature for adjacent barangays using ST_Touches.

PostGIS documents ST_Touches and ST_Intersects for these spatial relationships.

## 9. Frontend page structure

Main layout

- Left sidebar
  - search input
  - municipality dropdown
  - result list
  - selected barangay details
- Main map
  - municipality layer
  - barangay layer
  - highlight layer
  - popup on click

Pages

- `/` — default map view of Iloilo
- `/barangay/[psgcCode]` — direct barangay page
- optional `/municipality/[psgcCode]`

## 10. Map behavior plan

### Initial map load

Do not load all barangay polygons immediately.

Load:

- Iloilo province/municipality overview first
- then barangays only for selected municipality or search result

This is the biggest performance win.

### Layers

- Base map
- Municipality boundaries
- Barangay boundaries
- Selected barangay highlight
- optional labels

### On municipality selection

- fetch only that municipality’s barangays
- render polygons
- fit bounds to municipality

### On barangay selection

- highlight one polygon
- zoom to polygon bounds
- open sidebar details

MapLibre supports vector tile and source/layer-based rendering, which fits this approach well.

## 11. Search design

### Search fields

Search against:

- barangay name
- municipality name
- combined display label

### Result format

Always show:

- Barangay Name — Municipality, Iloilo

This avoids confusion for duplicate names.

### Search behavior

- minimum 2 characters
- debounced input
- top 10 results
- exact matches ranked first

### Search ranking

Priority:

- exact barangay name
- starts with barangay name
- partial barangay name
- combined barangay + municipality match

## 12. Performance plan

### MVP option

Use GeoJSON per municipality.

Good enough if:

- only one municipality’s barangays are loaded at a time

### Better option

Use vector tiles if:

- you want smoother pan/zoom
- you expect larger usage
- you want scalable styling

MapLibre GL JS is designed to render from vector tiles, and its docs include vector tile source examples.

### Geometry optimization

Keep two geometry versions:

- geom_full for exact queries
- geom_simplified for browser rendering

### Caching

- cache municipality lists
- cache barangay list per municipality
- cache selected barangay response

## 13. Suggested UX details

Sidebar fields for selected barangay

- barangay name
- municipality/city
- province
- PSGC code
- area, if computed
- centroid coordinates
- optional neighboring barangays

Buttons

- “Zoom to barangay”
- “Copy PSGC code”
- “Share link”

Nice extras later

- “Locate me” button
- dark mode
- printable barangay card

MapLibre includes a geolocation control, though browser geolocation requires supported browsers and usually HTTPS.

## 14. Security and data quality plan

### Data quality checks

Before release:

- verify barangay count per municipality
- verify polygon validity
- verify no missing PSGC codes
- verify multipolygons render correctly

### Geometry validation

Run:

- ST_IsValid
- ST_MakeValid where needed

### API protection

- rate limit search endpoint
- validate params
- avoid returning massive geometry blobs unless needed

## 15. Development phases

### Phase 0 — Discovery

Deliverables:

- final dataset source chosen
- Iloilo admin scope confirmed
- wireframe sketched

### Phase 1 — Data setup

Deliverables:

- PSGC Iloilo subset extracted
- boundary dataset imported
- PostGIS tables ready
- municipality/barangay counts validated

### Phase 2 — Backend

Deliverables:

- municipality endpoint
- barangay search endpoint
- barangay detail endpoint
- geometry endpoint

### Phase 3 — Frontend MVP

Deliverables:

- map loads
- municipality dropdown works
- barangay search works
- polygon highlight works
- details panel works

### Phase 4 — Polish

Deliverables:

- better styling
  app/
    page.tsx
    barangay/[psgcCode]/page.tsx
    api/
      municipalities/route.ts
      barangays/search/route.ts
      barangays/[psgcCode]/route.ts
      barangays/by-municipality/route.ts

  components/
    map/
      MapView.tsx
      BarangayLayer.tsx
      MunicipalityLayer.tsx
      HighlightLayer.tsx
    sidebar/
      SearchBox.tsx
      MunicipalitySelect.tsx
      BarangayDetails.tsx
      ResultsList.tsx

  lib/
    db.ts
    map.ts
    search.ts
    geometry.ts

  scripts/
    import-psgc.ts
    import-boundaries.ts
    build-search-index.ts
    validate-data.ts

  sql/
    schema.sql
    indexes.sql
    views.sql

  public/
    map-style.json

  docs/
    dataset-notes.md
    api-spec.md
17. Milestone-based build order
Milestone 1

Set up database and import Iloilo municipalities and barangays.

Milestone 2

Build /api/municipalities and /api/barangays/search.

Milestone 3

Render map and show municipality boundaries.

Milestone 4

Load barangays for selected municipality.

Milestone 5

Search and zoom to a barangay.

Milestone 6

Add detail page and sharable URL.

That sequence gives you a usable product early.

18. Recommended MVP acceptance criteria

The MVP is done when:

user can open the app and see Iloilo on a map
user can select a municipality/city
user can search barangays within Iloilo
clicking a result zooms to the correct polygon
a selected barangay shows correct PSGC code and municipality
map remains responsive on mobile and desktop
19. Risks to plan around
Risk 1: Boundary data mismatch

PSGC names/codes may be newer than public boundary files because PSA is still publishing recent 2026 updates.

Mitigation:

treat PSGC as naming/code authority
maintain a manual mapping table for mismatches
Risk 2: Large geometry payloads

Sending all Iloilo barangays at once may still feel heavy.

Mitigation:

load by municipality
simplify geometries
move to vector tiles later
Risk 3: Duplicate names

Some barangays can have common names.

Mitigation:

search result must always include municipality name
use PSGC code as internal key
20. Best first version

My recommendation for the first version:

Next.js
Postgres + PostGIS
MapLibre
GeoJSON loaded per municipality
PSGC-coded barangay search
no vector tiles yet

That is the fastest version that is still clean and scalable.