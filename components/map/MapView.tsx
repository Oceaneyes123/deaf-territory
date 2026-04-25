"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import type { BarangayDetail, BBox, BoundaryFeatureCollection, MunicipalitySummary, SearchResult } from "@/lib/territory-types";
import BarangayDetails from "../sidebar/BarangayDetails";
import MunicipalitySelect from "../sidebar/MunicipalitySelect";
import ResultsList from "../sidebar/ResultsList";
import SearchBox from "../sidebar/SearchBox";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="min-h-[58vh] rounded-2xl border border-slate-200 bg-[#edf3ed]" />,
});

type MapViewProps = {
  initialBarangayCode?: string;
  initialQueryMunicipalityCode?: string | null;
  initialQueryBarangayCode?: string | null;
};

type DataResponse<T> = {
  data: T;
};

const EMPTY_COLLECTION: BoundaryFeatureCollection = { type: "FeatureCollection", features: [] };
const LINK_COPY_RESET_DELAY_MS = 1800;

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

export default function MapView({
  initialBarangayCode,
  initialQueryMunicipalityCode = null,
  initialQueryBarangayCode = null,
}: MapViewProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isMunicipalityLoading, setIsMunicipalityLoading] = useState(false);
  const [isBarangayLoading, setIsBarangayLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const selectionRequestRef = useRef(0);
  const hasHydratedQueryRef = useRef(false);
  const barangayGeometryCacheRef = useRef(new Map<string, BoundaryFeatureCollection>());
  const barangayDetailCacheRef = useRef(new Map<string, BarangayDetail>());

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const debouncedSearchQuery = useDebouncedValue(deferredSearchQuery.trim(), 250);

  const ensureMunicipalityBarangays = useCallback(async (psgcCode: string) => {
    if (loadedMunicipalityCode === psgcCode && barangayGeometry) {
      return barangayGeometry;
    }

    const cachedGeometry = barangayGeometryCacheRef.current.get(psgcCode);
    if (cachedGeometry) {
      startTransition(() => {
        setBarangayGeometry(cachedGeometry);
        setLoadedMunicipalityCode(psgcCode);
      });
      return cachedGeometry;
    }

    const geometry = await fetchJson<BoundaryFeatureCollection>(`/api/barangays?municipality=${psgcCode}`);
    barangayGeometryCacheRef.current.set(psgcCode, geometry);
    startTransition(() => {
      setBarangayGeometry(geometry);
      setLoadedMunicipalityCode(psgcCode);
    });
    return geometry;
  }, [barangayGeometry, loadedMunicipalityCode]);

  const selectBarangay = useCallback(async (psgcCode: string) => {
    const requestId = ++selectionRequestRef.current;
    setSelectionError(null);
    setIsBarangayLoading(true);

    try {
      const cachedDetail = barangayDetailCacheRef.current.get(psgcCode);
      const detail = cachedDetail
        ? cachedDetail
        : (await fetchJson<DataResponse<BarangayDetail>>(`/api/barangays/${psgcCode}`)).data;

      if (!cachedDetail) {
        barangayDetailCacheRef.current.set(psgcCode, detail);
      }

      if (requestId !== selectionRequestRef.current) {
        return;
      }

      await ensureMunicipalityBarangays(detail.municipalityPsgcCode);
      if (requestId !== selectionRequestRef.current) {
        return;
      }

      startTransition(() => {
        setSelectedMunicipalityCode(detail.municipalityPsgcCode);
        setSelectedBarangayCode(detail.psgcCode);
        setSelectedBarangay(detail);
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
  }, [ensureMunicipalityBarangays]);

  const handleMunicipalitySelectionChange = useCallback(async (nextCode: string | null) => {
    selectionRequestRef.current += 1;
    setSelectionError(null);

    startTransition(() => {
      setSelectedMunicipalityCode(nextCode);

      if (!nextCode || (selectedBarangay && selectedBarangay.municipalityPsgcCode !== nextCode)) {
        setSelectedBarangayCode(null);
        setSelectedBarangay(null);
      }
    });

    if (!nextCode) {
      startTransition(() => {
        setBarangayGeometry(null);
        setLoadedMunicipalityCode(null);
      });
      return;
    }

    if (nextCode === loadedMunicipalityCode && barangayGeometry) {
      return;
    }

    setIsMunicipalityLoading(true);
    try {
      await ensureMunicipalityBarangays(nextCode);
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "Unable to load municipality barangays.");
    } finally {
      setIsMunicipalityLoading(false);
    }
  }, [barangayGeometry, ensureMunicipalityBarangays, loadedMunicipalityCode, selectedBarangay]);

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrap() {
      setIsBootLoading(true);
      setBootError(null);

      try {
        const municipalitiesPromise = fetchJson<DataResponse<MunicipalitySummary[]>>(
          "/api/municipalities",
          controller.signal,
        );
        const municipalityGeometryPromise = fetchJson<BoundaryFeatureCollection>(
          "/api/municipalities/geometry",
          controller.signal,
        );

        const municipalityResponse = await municipalitiesPromise;

        startTransition(() => {
          setMunicipalities(municipalityResponse.data);
        });

        municipalityGeometryPromise
          .then((geometry) => {
            if (!controller.signal.aborted) {
              startTransition(() => setMunicipalityGeometry(geometry));
            }
          })
          .catch((error) => {
            if (!controller.signal.aborted) {
              setBootError(error instanceof Error ? error.message : "Unable to load Iloilo map data.");
            }
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
    if (isBootLoading || municipalities.length === 0 || hasHydratedQueryRef.current) {
      return;
    }

    const hasInitialMunicipality = municipalities.some(
      (municipality) => municipality.psgcCode === initialQueryMunicipalityCode,
    );
    const initialMunicipalityCode = hasInitialMunicipality ? initialQueryMunicipalityCode : null;
    const initialFocusBarangay = initialQueryBarangayCode ?? initialBarangayCode ?? null;

    hasHydratedQueryRef.current = true;

    void (async () => {
      if (initialMunicipalityCode) {
        startTransition(() => {
          setSelectedMunicipalityCode(initialMunicipalityCode);
        });
      }

      if (initialFocusBarangay) {
        await selectBarangay(initialFocusBarangay);
        return;
      }

      if (initialMunicipalityCode) {
        await ensureMunicipalityBarangays(initialMunicipalityCode);
      }
    })();
    // Initial deep-link hydration should run once after boot data is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialBarangayCode,
    initialQueryBarangayCode,
    initialQueryMunicipalityCode,
    isBootLoading,
    municipalityGeometry,
    municipalities,
  ]);

  useEffect(() => {
    if (isBootLoading || !hasHydratedQueryRef.current) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (selectedMunicipalityCode) {
      nextParams.set("m", selectedMunicipalityCode);
    }
    if (selectedBarangayCode) {
      nextParams.set("b", selectedBarangayCode);
    }

    const nextQueryString = nextParams.toString();
    const currentQueryString = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;
    if (nextQueryString === currentQueryString) {
      return;
    }

    const targetUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [isBootLoading, pathname, router, selectedBarangayCode, selectedMunicipalityCode]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState("idle"), LINK_COPY_RESET_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    if (debouncedSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      setIsSearchLoading(true);
      setSearchError(null);

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
          setSearchError(error instanceof Error ? error.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchLoading(false);
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

  const selectedMunicipalityFeature = useMemo(
    () => (selectedMunicipalityCode ? (municipalityMap.get(selectedMunicipalityCode) ?? null) : null),
    [municipalityMap, selectedMunicipalityCode],
  );

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
  const emptyMessage = useMemo(() => {
    if (debouncedSearchQuery.length >= 2) {
      return "No matching barangays found.";
    }

    if (selectedMunicipalityCode) {
      return "No barangays found for this municipality.";
    }

    return "Select a municipality or search a barangay to begin.";
  }, [debouncedSearchQuery.length, selectedMunicipalityCode]);

  const activePlaceLabel = selectedBarangay
    ? selectedBarangay.displayName
    : selectedMunicipalityFeature
      ? `${selectedMunicipalityFeature.properties.name}, Iloilo`
      : "Province of Iloilo";
  const activeSubtitle = selectedBarangay
    ? `PSGC ${selectedBarangay.psgcCode}`
    : selectedMunicipalityFeature
      ? "Municipality boundary selected"
      : "Search or choose a municipality to focus the map";

  async function handleCopyContextLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch (_error) {
      setCopyState("error");
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f6f7f4] text-slate-950 lg:grid-cols-[360px_1fr]">
      <aside className="flex min-h-0 flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 lg:h-screen lg:border-b-0 lg:border-r lg:px-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-sm font-black text-white">
              DT
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">Deaf Territory</p>
              <p className="text-xs font-medium text-slate-500">Iloilo boundary lookup</p>
            </div>
          </div>
          <h1 className="text-2xl font-black leading-tight text-slate-950">Iloilo Territory Map</h1>
          <p className="text-sm leading-6 text-slate-600">
            Find barangay boundaries, inspect PSGC details, and share the active map context.
          </p>
        </div>

        <div className="space-y-4 border-y border-slate-200 py-4">
          <SearchBox
            value={searchQuery}
            onChange={(value) => {
              setSearchError(null);
              setSearchQuery(value);
            }}
            placeholder="Search barangay"
          />
          <MunicipalitySelect
            municipalities={municipalityOptions}
            value={selectedMunicipalityCode}
            loading={isMunicipalityLoading}
            onChange={(nextCode) => {
              void handleMunicipalitySelectionChange(nextCode);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => {
                selectionRequestRef.current += 1;
                startTransition(() => {
                  setSearchError(null);
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
              Reset
            </button>
          </div>
        </div>

        {bootError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{bootError}</div>
        ) : null}
        {selectionError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {selectionError}
          </div>
        ) : null}
        {searchError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {searchError}
          </div>
        ) : null}

        <ResultsList
          title={debouncedSearchQuery.length >= 2 ? "Results" : "Barangays"}
          items={listItems}
          selectedCode={selectedBarangayCode}
          emptyMessage={emptyMessage}
          isLoading={isSearchLoading}
          onSelect={(psgcCode) => {
            void selectBarangay(psgcCode);
          }}
        />

        <BarangayDetails
          barangay={selectedBarangay}
          loading={isBarangayLoading}
          onCopyLink={() => {
            void handleCopyContextLink();
          }}
          copyState={copyState}
        />
      </aside>

      <section className="flex min-h-screen flex-col px-4 py-4 lg:px-5">
        <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Current focus</p>
            <p className="mt-1 text-lg font-black leading-tight text-slate-950">{activePlaceLabel}</p>
            <p className="text-sm font-medium text-slate-500">{activeSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleCopyContextLink();
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {copyState === "copied" ? "Link copied" : "Copy link"}
            </button>
            {selectedBarangay ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${selectedBarangay.centroid[1]}&mlon=${selectedBarangay.centroid[0]}#map=15/${selectedBarangay.centroid[1]}/${selectedBarangay.centroid[0]}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                Open in OSM
              </a>
            ) : null}
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
            void handleMunicipalitySelectionChange(selectedMunicipalityCode === psgcCode ? null : psgcCode);
          }}
          onBarangaySelect={(psgcCode) => {
            void selectBarangay(psgcCode);
          }}
        />
      </section>
    </div>
  );
}
