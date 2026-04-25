"use client";

import { useEffect, useRef, useState } from "react";
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

const ROAD_BASE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
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

type StyleLayerLike = {
  id: string;
  type?: string;
  layout?: Record<string, unknown>;
};

const LABEL_LAYER_TOKENS = [
  "place",
  "settlement",
  "municipality",
  "locality",
  "village",
  "town",
  "city",
  "state",
  "country",
];

function getNameTextField(): ["get", string] {
  return ["get", "name"];
}

function isPlaceLabelLayer(layer: StyleLayerLike): boolean {
  if (layer.type !== "symbol") {
    return false;
  }

  const id = layer.id.toLowerCase();
  if (LABEL_LAYER_TOKENS.some((token) => id.includes(token))) {
    return true;
  }

  return typeof layer.layout?.["text-field"] !== "undefined" && id.includes("label");
}

function applyLabelReadabilityStyle(map: MapLibreMap) {
  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    if (!isPlaceLabelLayer(layer)) {
      continue;
    }

    map.setPaintProperty(layer.id, "text-color", "#2f241b");
    map.setPaintProperty(layer.id, "text-halo-color", "#f5ecdd");
    map.setPaintProperty(layer.id, "text-halo-width", 1.2);
    map.setPaintProperty(layer.id, "text-halo-blur", 0.35);
  }
}

function addOverlayLayers(map: MapLibreMap) {
  if (!map.getSource("municipalities")) {
    map.addSource("municipalities", {
      type: "geojson",
      data: EMPTY_COLLECTION as FeatureCollection,
    });
  }

  if (!map.getSource("barangays")) {
    map.addSource("barangays", {
      type: "geojson",
      data: EMPTY_COLLECTION as FeatureCollection,
    });
  }

  if (!map.getSource("highlight")) {
    map.addSource("highlight", {
      type: "geojson",
      data: EMPTY_COLLECTION as FeatureCollection,
    });
  }

  if (!map.getLayer("municipalities-fill")) {
    map.addLayer({
      id: "municipalities-fill",
      type: "fill",
      source: "municipalities",
      paint: {
        "fill-color": "#c9b78d",
        "fill-opacity": 0.54,
      },
    });
  }

  if (!map.getLayer("municipalities-outline")) {
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
  }

  if (!map.getLayer("municipalities-label")) {
    map.addLayer({
      id: "municipalities-label",
      type: "symbol",
      source: "municipalities",
      layout: {
        "text-field": getNameTextField(),
        "text-font": ["Open Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 11, 15, 14, 20],
        "text-letter-spacing": 0.02,
        "text-padding": 8,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": "#3f2f22",
        "text-halo-color": "#f6edcf",
        "text-halo-width": 1.6,
        "text-halo-blur": 0.4,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.86, 11, 0.72, 12.5, 0],
      },
    });
  }

  if (!map.getLayer("barangays-fill")) {
    map.addLayer({
      id: "barangays-fill",
      type: "fill",
      source: "barangays",
      paint: {
        "fill-color": "#f0dcc0",
        "fill-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("barangays-outline")) {
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
  }

  if (!map.getLayer("barangays-label")) {
    map.addLayer({
      id: "barangays-label",
      type: "symbol",
      source: "barangays",
      minzoom: 10.5,
      layout: {
        "text-field": getNameTextField(),
        "text-font": ["Open Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10.5, 10, 13, 12, 15, 15],
        "text-padding": 6,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": "#4b3325",
        "text-halo-color": "#fff3dc",
        "text-halo-width": 1.4,
        "text-halo-blur": 0.35,
      },
    });
  }

  if (!map.getLayer("highlight-outline")) {
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
  }
}

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
  const [hasStyleError, setHasStyleError] = useState(false);

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
      style: ROAD_BASE_STYLE,
      center: [122.5621, 10.7202],
      zoom: 9.8,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    const bootstrapOverlay = () => {
      applyLabelReadabilityStyle(map);
      addOverlayLayers(map);
      updateGeoJsonSource(map, "municipalities", municipalities);
      updateGeoJsonSource(map, "barangays", barangays);
      updateGeoJsonSource(map, "highlight", highlight);
    };

    map.on("load", () => {
      bootstrapOverlay();
    });

    map.on("styledata", () => {
      if (!map.isStyleLoaded()) {
        return;
      }

      bootstrapOverlay();
    });

    map.on("error", () => {
      setHasStyleError(true);
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

    const selectedCodeExpression = selectedMunicipalityCode
      ? ["==", ["get", "psgcCode"], selectedMunicipalityCode]
      : false;

    map.setPaintProperty("municipalities-fill", "fill-color", [
      "case",
      selectedCodeExpression,
      "#b8692f",
      "#c9b78d",
    ]);
    map.setPaintProperty("municipalities-fill", "fill-opacity", [
      "case",
      selectedCodeExpression,
      0.38,
      0.42,
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
      0.42,
      0.22,
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
      <div ref={containerRef} className="h-[calc(100vh-8rem)] min-h-[52vh] w-full" />
      {hasStyleError ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm">
          Some map tiles could not be loaded.
        </div>
      ) : null}
    </div>
  );
}
