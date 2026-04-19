"use client";

import { useEffect, useRef } from "react";
import type { FeatureCollection } from "geojson";
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { BBox, BoundaryFeatureCollection } from "@/lib/territory-types";

type MapCanvasProps = {
  municipalities: BoundaryFeatureCollection | null;
  barangays: BoundaryFeatureCollection | null;
  highlight: BoundaryFeatureCollection | null;
  focusBbox: BBox | null;
  overviewBbox: BBox | null;
  selectedMunicipalityCode: string | null;
  selectedBarangayCode: string | null;
  onMunicipalitySelect: (psgcCode: string) => void;
  onBarangaySelect: (psgcCode: string) => void;
};

const EMPTY_COLLECTION: BoundaryFeatureCollection = { type: "FeatureCollection", features: [] };

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function updateGeoJsonSource(map: MapLibreMap, sourceId: string, data: BoundaryFeatureCollection | null) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source) {
    return;
  }

  source.setData((data ?? EMPTY_COLLECTION) as FeatureCollection);
}

function toBounds(bbox: BBox): LngLatBoundsLike {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]],
  ];
}

function isValidBbox(bbox: BBox | null): bbox is BBox {
  if (!bbox) {
    return false;
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;

  return (
    Number.isFinite(minLng) &&
    Number.isFinite(minLat) &&
    Number.isFinite(maxLng) &&
    Number.isFinite(maxLat) &&
    minLng >= -180 &&
    maxLng <= 180 &&
    minLat >= -90 &&
    maxLat <= 90 &&
    minLng < maxLng &&
    minLat < maxLat
  );
}

export default function MapCanvas({
  municipalities,
  barangays,
  highlight,
  focusBbox,
  overviewBbox,
  selectedMunicipalityCode,
  selectedBarangayCode,
  onMunicipalitySelect,
  onBarangaySelect,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const lastViewportKeyRef = useRef<string | null>(null);
  const municipalitySelectRef = useRef(onMunicipalitySelect);
  const barangaySelectRef = useRef(onBarangaySelect);

  useEffect(() => {
    municipalitySelectRef.current = onMunicipalitySelect;
  }, [onMunicipalitySelect]);

  useEffect(() => {
    barangaySelectRef.current = onBarangaySelect;
  }, [onBarangaySelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [122.5621, 10.7202],
      zoom: 9.8,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource("municipalities", {
        type: "geojson",
        data: EMPTY_COLLECTION as FeatureCollection,
      });
      map.addSource("barangays", {
        type: "geojson",
        data: EMPTY_COLLECTION as FeatureCollection,
      });
      map.addSource("highlight", {
        type: "geojson",
        data: EMPTY_COLLECTION as FeatureCollection,
      });

      map.addLayer({
        id: "municipalities-fill",
        type: "fill",
        source: "municipalities",
        paint: {
          "fill-color": "#c9b78d",
          "fill-opacity": 0.26,
        },
      });
      map.addLayer({
        id: "municipalities-outline",
        type: "line",
        source: "municipalities",
        paint: {
          "line-color": "#534338",
          "line-width": 1.4,
          "line-opacity": 0.72,
        },
      });
      map.addLayer({
        id: "barangays-fill",
        type: "fill",
        source: "barangays",
        paint: {
          "fill-color": "#f0dcc0",
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "barangays-outline",
        type: "line",
        source: "barangays",
        paint: {
          "line-color": "#8b5e3c",
          "line-width": 1,
          "line-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "highlight-outline",
        type: "line",
        source: "highlight",
        paint: {
          "line-color": "#8f1d1d",
          "line-width": 3,
          "line-dasharray": [1.2, 1],
        },
      });

      map.on("click", "municipalities-fill", (event) => {
        const code = event.features?.[0]?.properties?.psgcCode;
        if (typeof code === "string") {
          municipalitySelectRef.current(code);
        }
      });

      map.on("click", "barangays-fill", (event) => {
        const code = event.features?.[0]?.properties?.psgcCode;
        if (typeof code === "string") {
          barangaySelectRef.current(code);
        }
      });

      for (const layerId of ["municipalities-fill", "barangays-fill"]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      updateGeoJsonSource(map, "municipalities", municipalities);
      updateGeoJsonSource(map, "barangays", barangays);
      updateGeoJsonSource(map, "highlight", highlight);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [barangays, highlight, municipalities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    updateGeoJsonSource(map, "municipalities", municipalities);
  }, [municipalities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    updateGeoJsonSource(map, "barangays", barangays);
  }, [barangays]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    updateGeoJsonSource(map, "highlight", highlight);
  }, [highlight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    map.setPaintProperty("municipalities-fill", "fill-color", [
      "case",
      ["==", ["get", "psgcCode"], selectedMunicipalityCode ?? ""],
      "#b8692f",
      "#c9b78d",
    ]);
    map.setPaintProperty("municipalities-fill", "fill-opacity", [
      "case",
      ["==", ["get", "psgcCode"], selectedMunicipalityCode ?? ""],
      0.4,
      0.24,
    ]);
  }, [selectedMunicipalityCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    map.setPaintProperty("barangays-fill", "fill-color", [
      "case",
      ["==", ["get", "psgcCode"], selectedBarangayCode ?? ""],
      "#b64033",
      "#f0dcc0",
    ]);
    map.setPaintProperty("barangays-fill", "fill-opacity", [
      "case",
      ["==", ["get", "psgcCode"], selectedBarangayCode ?? ""],
      0.7,
      0.48,
    ]);
    map.setPaintProperty("barangays-outline", "line-width", [
      "case",
      ["==", ["get", "psgcCode"], selectedBarangayCode ?? ""],
      2,
      1,
    ]);
  }, [selectedBarangayCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const target = isValidBbox(focusBbox) ? focusBbox : isValidBbox(overviewBbox) ? overviewBbox : null;
    if (!target) {
      return;
    }

    const viewportKey = target.join("|");
    if (lastViewportKeyRef.current === viewportKey) {
      return;
    }

    const fit = () => {
      map.fitBounds(toBounds(target), {
        padding: 48,
        duration: 750,
        maxZoom: focusBbox ? 14.5 : 11.5,
      });
      lastViewportKeyRef.current = viewportKey;
    };

    if (map.isStyleLoaded()) {
      fit();
      return;
    }

    map.once("load", fit);
  }, [focusBbox, overviewBbox]);

  return (
    <div className="relative min-h-[52vh] overflow-hidden rounded-[32px] border border-stone-200 bg-[#eadcc6] shadow-[0_24px_60px_rgba(28,25,23,0.14)]">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-stone-900/10 bg-white/75 px-5 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">Iloilo Territory Map</p>
          <p className="text-sm text-stone-700">Municipality overview first, barangays loaded on demand.</p>
        </div>
      </div>
      <div ref={containerRef} className="h-[calc(100vh-8rem)] min-h-[52vh] w-full" />
    </div>
  );
}
