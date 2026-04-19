"use client";

import dynamic from "next/dynamic";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import type { BarangayDetail, BBox, BoundaryFeatureCollection, MunicipalitySummary, SearchResult } from "@/lib/territory-types";
import BarangayDetails from "../sidebar/BarangayDetails";
import MunicipalitySelect from "../sidebar/MunicipalitySelect";
import ResultsList from "../sidebar/ResultsList";
import SearchBox from "../sidebar/SearchBox";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[52vh] rounded-[32px] border border-stone-200 bg-[#eadcc6] px-6 py-10 text-sm text-stone-600">
      Loading interactive map…
    </div>
  ),
});

type MapViewProps = {
  initialBarangayCode?: string;
};

type DataResponse<T> = {
  data: T;
};

const EMPTY_COLLECTION: BoundaryFeatureCollection = { type: "FeatureCollection", features: [] };

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

async function fetchJson<T extends object>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { accept: "application/json" } });
  const json = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message = "error" in json && typeof json.error === "string" ? json.error : "Request failed.";
    throw new Error(message);
  }

  return json as T;
}

function mergeBBoxes(bboxes: BBox[]): BBox | null {
  if (bboxes.length === 0) {
    return null;
  }

  return bboxes.reduce<BBox>(
    (combined, current) => [
      Math.min(combined[0], current[0]),
      Math.min(combined[1], current[1]),
      Math.max(combined[2], current[2]),
      Math.max(combined[3], current[3]),
    ],
    [...bboxes[0]] as BBox,
  );
}

export default function MapView({ initialBarangayCode }: MapViewProps) {
  const [municipalities, setMunicipalities] = useState<MunicipalitySummary[]>([]);
  const [municipalityGeometry, setMunicipalityGeometry] = useState<BoundaryFeatureCollection | null>(null);
  const [barangayGeometry, setBarangayGeometry] = useState<BoundaryFeatureCollection | null>(null);
  const [loadedMunicipalityCode, setLoadedMunicipalityCode] = useState<string | null>(null);
  const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState<string | null>(null);
  const [selectedBarangayCode, setSelectedBarangayCode] = useState<string | null>(initialBarangayCode ?? null);
  const [selectedBarangay, setSelectedBarangay] = useState<BarangayDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isMunicipalityLoading, setIsMunicipalityLoading] = useState(false);
  const [isBarangayLoading, setIsBarangayLoading] = useState(false);
  const selectionRequestRef = useRef(0);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const debouncedSearchQuery = useDebouncedValue(deferredSearchQuery.trim(), 250);

  async function ensureMunicipalityBarangays(psgcCode: string) {
    if (loadedMunicipalityCode === psgcCode && barangayGeometry) {
      return barangayGeometry;
    }

    const geometry = await fetchJson<BoundaryFeatureCollection>(`/api/barangays?municipality=${psgcCode}`);
    startTransition(() => {
      setBarangayGeometry(geometry);
      setLoadedMunicipalityCode(psgcCode);
    });
    return geometry;
  }

  async function selectBarangay(psgcCode: string) {
    const requestId = ++selectionRequestRef.current;
    setSelectionError(null);
    setIsBarangayLoading(true);

    try {
      const response = await fetchJson<DataResponse<BarangayDetail>>(`/api/barangays/${psgcCode}`);
      if (requestId !== selectionRequestRef.current) {
        return;
      }

      await ensureMunicipalityBarangays(response.data.municipalityPsgcCode);
      if (requestId !== selectionRequestRef.current) {
        return;
      }

      startTransition(() => {
        setSelectedMunicipalityCode(response.data.municipalityPsgcCode);
        setSelectedBarangayCode(response.data.psgcCode);
        setSelectedBarangay(response.data);
      });
    } catch (error) {
      if (requestId !== selectionRequestRef.current) {
        return;
      }

      setSelectionError(error instanceof Error ? error.message : "Unable to load barangay details.");
    } finally {
      if (requestId === selectionRequestRef.current) {
        setIsBarangayLoading(false);
      }
    }
  }

  async function handleMunicipalityChange(psgcCode: string | null) {
    selectionRequestRef.current += 1;
    setSelectionError(null);

    if (!psgcCode) {
      startTransition(() => {
        setSelectedMunicipalityCode(null);
        setSelectedBarangayCode(null);
        setSelectedBarangay(null);
        setBarangayGeometry(null);
        setLoadedMunicipalityCode(null);
      });
      return;
    }

    setIsMunicipalityLoading(true);
    try {
      await ensureMunicipalityBarangays(psgcCode);
      startTransition(() => {
        setSelectedMunicipalityCode(psgcCode);
        setSelectedBarangayCode(null);
        setSelectedBarangay(null);
      });
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "Unable to load municipality barangays.");
    } finally {
      setIsMunicipalityLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrap() {
      setIsBootLoading(true);
      setBootError(null);

      try {
        const [municipalityResponse, geometryResponse] = await Promise.all([
          fetchJson<DataResponse<MunicipalitySummary[]>>("/api/municipalities", controller.signal),
          fetchJson<BoundaryFeatureCollection>("/api/municipalities/geometry", controller.signal),
        ]);

        startTransition(() => {
          setMunicipalities(municipalityResponse.data);
          setMunicipalityGeometry(geometryResponse);
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setBootError(error instanceof Error ? error.message : "Unable to load Iloilo map data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsBootLoading(false);
        }
      }
    }

    void bootstrap();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialBarangayCode || isBootLoading || !municipalityGeometry) {
      return;
    }

    void selectBarangay(initialBarangayCode);
    // initial deep-link hydration should run once after boot data is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBarangayCode, isBootLoading, municipalityGeometry]);

  useEffect(() => {
    if (debouncedSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      try {
        const response = await fetchJson<DataResponse<SearchResult[]>>(
          `/api/barangays/search?q=${encodeURIComponent(debouncedSearchQuery)}`,
          controller.signal,
        );
        startTransition(() => {
          setSearchResults(response.data);
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setSelectionError(error instanceof Error ? error.message : "Search failed.");
        }
      }
    }

    void runSearch();

    return () => controller.abort();
  }, [debouncedSearchQuery]);

  const municipalityMap = useMemo(() => {
    return new Map(
      (municipalityGeometry?.features ?? []).map((feature) => [feature.properties.psgcCode, feature] as const),
    );
  }, [municipalityGeometry]);

  const municipalityOptions = useMemo(
    () => municipalities.map((municipality) => ({ code: municipality.psgcCode, name: municipality.name })),
    [municipalities],
  );

  const selectedMunicipalityFeature = selectedMunicipalityCode
    ? municipalityMap.get(selectedMunicipalityCode) ?? null
    : null;

  const overviewBbox = useMemo(
    () => mergeBBoxes((municipalityGeometry?.features ?? []).map((feature) => feature.properties.bbox)),
    [municipalityGeometry],
  );

  const listItems = useMemo(() => {
    if (debouncedSearchQuery.length >= 2) {
      return searchResults.map((result) => ({
        code: result.psgcCode,
        name: result.name,
        municipalityName: result.municipalityName,
        displayName: result.displayName,
      }));
    }

    return (barangayGeometry?.features ?? []).map((feature) => ({
      code: feature.properties.psgcCode,
      name: feature.properties.name,
      municipalityName: feature.properties.municipalityName,
      displayName: `${feature.properties.name}, ${feature.properties.municipalityName}, Iloilo`,
    }));
  }, [barangayGeometry, debouncedSearchQuery.length, searchResults]);

  const highlight = useMemo<BoundaryFeatureCollection | null>(() => {
    if (selectedBarangay) {
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: selectedBarangay.geometry,
            properties: {
              psgcCode: selectedBarangay.psgcCode,
              name: selectedBarangay.name,
              municipalityCode: selectedBarangay.municipalityPsgcCode,
              municipalityName: selectedBarangay.municipalityName,
              bbox: selectedBarangay.bbox,
            },
          },
        ],
      };
    }

    if (selectedMunicipalityFeature) {
      return { type: "FeatureCollection", features: [selectedMunicipalityFeature] };
    }

    return null;
  }, [selectedBarangay, selectedMunicipalityFeature]);

  const focusBbox = selectedBarangay?.bbox ?? selectedMunicipalityFeature?.properties.bbox ?? null;

  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,201,120,0.18),_transparent_30%),linear-gradient(180deg,#f8f2e8_0%,#f3eee5_100%)] md:grid-cols-[390px_1fr]">
      <aside className="flex min-h-screen flex-col gap-6 border-b border-stone-200/70 px-5 py-6 md:border-b-0 md:border-r md:px-7">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-stone-300 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500 backdrop-blur">
            Deaf Territory
          </div>
          <div className="space-y-3">
            <h1 className="max-w-sm text-4xl font-semibold leading-tight text-stone-950">
              Search Iloilo barangays and inspect live administrative boundaries.
            </h1>
            <p className="max-w-sm text-sm leading-6 text-stone-600">
              Municipality geometry loads first. Barangay polygons stay scoped to the selected municipality or deep link so the map remains responsive.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_18px_40px_rgba(41,37,36,0.08)] backdrop-blur">
          <SearchBox
            value={searchQuery}
            onChange={(value) => {
              setSelectionError(null);
              setSearchQuery(value);
            }}
            placeholder="Type a barangay name or PSGC code"
          />
          <MunicipalitySelect
            municipalities={municipalityOptions}
            value={selectedMunicipalityCode}
            loading={isMunicipalityLoading}
            onChange={(value) => {
              void handleMunicipalityChange(value);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              onClick={() => {
                selectionRequestRef.current += 1;
                startTransition(() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setSelectedMunicipalityCode(null);
                  setSelectedBarangayCode(null);
                  setSelectedBarangay(null);
                  setBarangayGeometry(null);
                  setLoadedMunicipalityCode(null);
                });
              }}
            >
              Reset map
            </button>
            <div className="rounded-full bg-stone-950 px-4 py-2 text-sm text-white">
              {selectedMunicipalityCode ? "Scoped municipality view" : "Iloilo overview"}
            </div>
          </div>
        </div>

        {bootError ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bootError}</div>
        ) : null}
        {selectionError ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {selectionError}
          </div>
        ) : null}

        <ResultsList
          title={debouncedSearchQuery.length >= 2 ? "Search Results" : "Municipality Barangays"}
          items={listItems}
          selectedCode={selectedBarangayCode}
          emptyMessage={
            debouncedSearchQuery.length >= 2
              ? "No barangays match that query in the current Iloilo dataset."
              : selectedMunicipalityCode
                ? "This municipality has no loaded barangays yet."
                : "Pick a municipality or search for a barangay to load polygon results."
          }
          onSelect={(psgcCode) => {
            void selectBarangay(psgcCode);
          }}
        />

        <BarangayDetails barangay={selectedBarangay} loading={isBarangayLoading} />
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-6 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-4 rounded-[28px] border border-stone-200 bg-white/70 px-5 py-4 shadow-[0_18px_40px_rgba(41,37,36,0.06)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Current Focus</p>
            <p className="mt-1 text-lg font-medium text-stone-900">
              {selectedBarangay
                ? selectedBarangay.displayName
                : selectedMunicipalityFeature
                  ? `${selectedMunicipalityFeature.properties.name}, Iloilo`
                  : "Iloilo Province overview"}
            </p>
          </div>
          <div className="text-right text-sm text-stone-500">
            <div>{isBootLoading ? "Loading base layers…" : "Base layer ready"}</div>
            <div>{isMunicipalityLoading ? "Loading scoped barangays…" : "Barangays load on demand"}</div>
          </div>
        </div>

        <MapCanvas
          municipalities={municipalityGeometry ?? EMPTY_COLLECTION}
          barangays={barangayGeometry}
          highlight={highlight}
          focusBbox={focusBbox}
          overviewBbox={overviewBbox}
          selectedMunicipalityCode={selectedMunicipalityCode}
          selectedBarangayCode={selectedBarangayCode}
          onMunicipalitySelect={(psgcCode) => {
            void handleMunicipalityChange(psgcCode);
          }}
          onBarangaySelect={(psgcCode) => {
            void selectBarangay(psgcCode);
          }}
        />
      </section>
    </div>
  );
}
