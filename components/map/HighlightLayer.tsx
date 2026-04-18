"use client";

import { GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LeafletMouseEvent } from "leaflet";
import type { BoundaryFeatureCollection } from "./MapView";

type HighlightLayerProps = {
  data: BoundaryFeatureCollection | null;
  color?: string;
  onClick?: (psgcCode: string) => void;
};

export default function HighlightLayer({ data, color = "#2563eb", onClick }: HighlightLayerProps) {
  if (!data) return null;

  return (
    <GeoJSON
      data={data as unknown as GeoJsonObject}
      style={{
        color,
        weight: 3,
        fillOpacity: 0,
        dashArray: "6 6",
      }}
      onEachFeature={(feature, layer) => {
        layer.on({
          click: (_event: LeafletMouseEvent) => {
            const psgcCode = feature.properties?.psgcCode as string | undefined;
            if (psgcCode && onClick) {
              onClick(psgcCode);
            }
          },
        });
      }}
    />
  );
}
