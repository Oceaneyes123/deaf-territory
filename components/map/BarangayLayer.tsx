"use client";

import { GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LeafletMouseEvent } from "leaflet";
import type { BoundaryFeatureCollection } from "./MapView";

type BarangayLayerProps = {
  data: BoundaryFeatureCollection | null;
  municipalityCode: string | null;
  selectedCode: string | null;
  onSelect: (psgcCode: string) => void;
};

export default function BarangayLayer({
  data,
  municipalityCode,
  selectedCode,
  onSelect,
}: BarangayLayerProps) {
  if (!data || !municipalityCode) return null;

  const filtered = {
    type: "FeatureCollection",
    features: data.features.filter((feature) => feature.properties.municipalityCode === municipalityCode),
  } as BoundaryFeatureCollection;

  return (
    <GeoJSON
      data={filtered as unknown as GeoJsonObject}
      style={(feature) => {
        const code = feature?.properties?.psgcCode as string | undefined;
        const isSelected = code === selectedCode;
        return {
          color: isSelected ? "#be123c" : "#64748b",
          weight: isSelected ? 2 : 1,
          fillColor: isSelected ? "#fb7185" : "#f1f5f9",
          fillOpacity: isSelected ? 0.8 : 0.5,
        };
      }}
      onEachFeature={(feature, layer) => {
        layer.on({
          click: (_event: LeafletMouseEvent) => {
            const psgcCode = feature.properties?.psgcCode as string | undefined;
            if (psgcCode) {
              onSelect(psgcCode);
            }
          },
        });

        const name = feature.properties?.name as string | undefined;
        if (name) {
          layer.bindTooltip(name, { sticky: true });
        }
      }}
    />
  );
}
