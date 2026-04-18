"use client";

import { GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LeafletMouseEvent } from "leaflet";
import type { BoundaryFeatureCollection } from "./MapView";

type MunicipalityLayerProps = {
  data: BoundaryFeatureCollection | null;
  selectedCode: string | null;
  onSelect: (psgcCode: string) => void;
};

export default function MunicipalityLayer({ data, selectedCode, onSelect }: MunicipalityLayerProps) {
  if (!data) return null;

  return (
    <GeoJSON
      data={data as unknown as GeoJsonObject}
      style={(feature) => {
        const code = feature?.properties?.psgcCode as string | undefined;
        const isSelected = code === selectedCode;

        return {
          color: isSelected ? "#2563eb" : "#0f172a",
          weight: isSelected ? 2.5 : 1,
          fillColor: isSelected ? "#93c5fd" : "#cbd5e1",
          fillOpacity: 0.45,
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

        if (feature.properties?.name) {
          layer.bindTooltip(feature.properties.name as string, { sticky: true });
        }
      }}
    />
  );
}
