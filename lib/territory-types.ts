import type { FeatureCollection, Geometry } from "geojson";

export type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export type MunicipalityType = "city" | "municipality";

export type MunicipalitySummary = {
  psgcCode: string;
  name: string;
  type: MunicipalityType;
};

export type SearchResult = {
  psgcCode: string;
  name: string;
  displayName: string;
  municipalityPsgcCode: string;
  municipalityName: string;
};

export type BoundaryFeatureProperties = {
  psgcCode: string;
  name: string;
  bbox: BBox;
  type?: MunicipalityType;
  municipalityCode?: string;
  municipalityName?: string;
};

export type BoundaryFeatureCollection = FeatureCollection<Geometry, BoundaryFeatureProperties>;

export type BarangayDetail = {
  psgcCode: string;
  name: string;
  displayName: string;
  municipalityPsgcCode: string;
  municipalityName: string;
  provinceName: string;
  regionName: string;
  centroid: [lng: number, lat: number];
  bbox: BBox;
  areaSqKm: number | null;
  geometry: Geometry;
};
