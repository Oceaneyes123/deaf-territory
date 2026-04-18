"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { FeatureCollection, GeoJsonObject } from "geojson";
import { usePathname } from "next/navigation";
import MunicipalityLayer from "./MunicipalityLayer";
import BarangayLayer from "./BarangayLayer";
import HighlightLayer from "./HighlightLayer";
import SearchBox from "../sidebar/SearchBox";
import MunicipalitySelect from "../sidebar/MunicipalitySelect";
import ResultsList from "../sidebar/ResultsList";
import BarangayDetails from "../sidebar/BarangayDetails";

export type BoundaryFeatureProperties = {
  psgcCode: string;
  name: string;
  municipalityCode?: string;
  municipalityName?: string;
  [key: string]: unknown;
};

export type BoundaryFeatureCollection = FeatureCollection<GeoJsonObject, BoundaryFeatureProperties>;

type MapViewProps = {
  municipalitySource: string;
  barangaySource: string;
  initialBarangayCode?: string;
};

const ILOILO_CENTER: [number, number] = [10.7202, 122.5621];
const ILOILO_ZOOM = 10;

function FitGeoJsonBounds({ data }: { data?: BoundaryFeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) {
      return;
    }

    const L = require("leaflet");
    const layer = L.geoJSON(data as unknown as GeoJsonObject);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }
  }, [data, map]);

  return null;
}

function parseBarangayCodeFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;

  const match = pathname.match(/\/barangay\/([^/]+)/);
  return match?.[1];
}

export default function MapView({
  municipalitySource,
  barangaySource,
  initialBarangayCode,
}: MapViewProps) {
  const pathname = usePathname();
  const hydratedBarangayCode = initialBarangayCode ?? parseBarangayCodeFromPath(pathname);

  const [query, setQuery] = useState("");
  const [municipalities, setMunicipalities] = useState<BoundaryFeatureCollection | null>(null);
  const [barangays, setBarangays] = useState<BoundaryFeatureCollection | null>(null);
  const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState<string | null>(null);
  const [selectedBarangayCode, setSelectedBarangayCode] = useState<string | null>(hydratedBarangayCode ?? null);

  useEffect(() => {
    let isCancelled = false;

    async function loadMunicipalities() {
      const response = await fetch(municipalitySource, { cache: "force-cache" });
      const json = (await response.json()) as BoundaryFeatureCollection;
      if (!isCancelled) {
        setMunicipalities(json);
      }
    }

    loadMunicipalities();

    return () => {
      isCancelled = true;
    };
  }, [municipalitySource]);

  useEffect(() => {
    if (!selectedMunicipalityCode && !selectedBarangayCode) {
      return;
    }

    let isCancelled = false;

    async function loadBarangays() {
      const response = await fetch(barangaySource, { cache: "force-cache" });
      const json = (await response.json()) as BoundaryFeatureCollection;
      if (!isCancelled) {
        setBarangays(json);
      }
    }

    loadBarangays();

    return () => {
      isCancelled = true;
    };
  }, [barangaySource, selectedMunicipalityCode, selectedBarangayCode]);

  useEffect(() => {
    if (!hydratedBarangayCode || !barangays?.features?.length) {
      return;
    }

    const barangay = barangays.features.find((feature) => feature.properties.psgcCode === hydratedBarangayCode);
    if (!barangay) {
      return;
    }

    setSelectedBarangayCode(barangay.properties.psgcCode);
    if (barangay.properties.municipalityCode) {
      setSelectedMunicipalityCode(barangay.properties.municipalityCode);
    }
  }, [barangays, hydratedBarangayCode]);

  const municipalitiesList = useMemo(
    () =>
      municipalities?.features.map((feature) => ({
        code: feature.properties.psgcCode,
        name: feature.properties.name,
      })) ?? [],
    [municipalities],
  );

  const filteredBarangays = useMemo(() => {
    const source = barangays?.features ?? [];

    return source.filter((feature) => {
      const byMunicipality =
        !selectedMunicipalityCode || feature.properties.municipalityCode === selectedMunicipalityCode;
      const byQuery =
        !query ||
        feature.properties.name.toLowerCase().includes(query.toLowerCase()) ||
        feature.properties.psgcCode.includes(query);
      return byMunicipality && byQuery;
    });
  }, [barangays, query, selectedMunicipalityCode]);

  const selectedMunicipality = municipalities?.features.find(
    (feature) => feature.properties.psgcCode === selectedMunicipalityCode,
  );

  const selectedBarangay = barangays?.features.find((feature) => feature.properties.psgcCode === selectedBarangayCode);

  const focusCollection: BoundaryFeatureCollection | null = selectedBarangay
    ? { type: "FeatureCollection", features: [selectedBarangay] }
    : selectedMunicipality
      ? { type: "FeatureCollection", features: [selectedMunicipality] }
      : null;

  return (
    <div className="map-layout">
      <aside className="sidebar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search barangay or PSGC code" />
        <MunicipalitySelect
          municipalities={municipalitiesList}
          value={selectedMunicipalityCode}
          onChange={(municipalityCode) => {
            setSelectedMunicipalityCode(municipalityCode);
            setSelectedBarangayCode(null);
          }}
        />
        <ResultsList
          items={filteredBarangays.map((feature) => ({
            code: feature.properties.psgcCode,
            name: feature.properties.name,
            municipalityName: feature.properties.municipalityName ?? "",
          }))}
          selectedCode={selectedBarangayCode}
          onSelect={(psgcCode) => {
            setSelectedBarangayCode(psgcCode);
            const selected = filteredBarangays.find((feature) => feature.properties.psgcCode === psgcCode);
            if (selected?.properties.municipalityCode) {
              setSelectedMunicipalityCode(selected.properties.municipalityCode);
            }
          }}
        />
        <BarangayDetails
          barangay={
            selectedBarangay
              ? {
                  code: selectedBarangay.properties.psgcCode,
                  name: selectedBarangay.properties.name,
                  municipality: selectedBarangay.properties.municipalityName,
                }
              : null
          }
        />
      </aside>

      <MapContainer center={ILOILO_CENTER} zoom={ILOILO_ZOOM} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MunicipalityLayer
          data={municipalities}
          selectedCode={selectedMunicipalityCode}
          onSelect={(psgcCode) => {
            setSelectedMunicipalityCode(psgcCode);
            setSelectedBarangayCode(null);
          }}
        />

        <BarangayLayer
          data={barangays}
          municipalityCode={selectedMunicipalityCode}
          selectedCode={selectedBarangayCode}
          onSelect={(psgcCode) => setSelectedBarangayCode(psgcCode)}
        />

        <HighlightLayer
          data={focusCollection}
          color={selectedBarangay ? "#e11d48" : "#2563eb"}
          onClick={(featureCode) => {
            if (selectedBarangay && selectedBarangay.properties.psgcCode === featureCode) {
              setSelectedBarangayCode(featureCode);
            } else {
              setSelectedMunicipalityCode(featureCode);
            }
          }}
        />

        <FitGeoJsonBounds data={focusCollection} />
      </MapContainer>
    </div>
  );
}
