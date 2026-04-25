"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import type { BarangayDetail, BBox, BoundaryFeatureCollection, MunicipalitySummary, SearchResult } from "@/lib/territory-types";
import BarangayDetails from "../sidebar/BarangayDetails";
import MunicipalitySelect from "../sidebar/MunicipalitySelect";
import ResultsList from "../sidebar/ResultsList";
import SearchBox from "../sidebar/SearchBox";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="min-h-[52vh] rounded-[32px] border border-stone-200 bg-[#eadcc6]" />,
});

type MapViewProps = {
  initialBarangayCode?: string;
  initialQueryMunicipalityCode?: string | null;
  initialQueryBarangayCode?: string | null;
};

type DataResponse<T> = {
  data: T;
};

type BootstrapPayload = {
  municipalities: MunicipalitySummary[];
  municipalityGeometry: BoundaryFeatureCollection;
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

  async function ensureMunicipalityBarangays(psgcCode: string) {
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
  }

  async function selectBarangay(psgcCode: string) {
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
  }

  async function handleMunicipalitySelectionChange(nextCode: string | null) {
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
  }

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrap() {
      setIsBootLoading(true);
      setBootError(null);

      try {
        const response = await fetchJson<DataResponse<BootstrapPayload>>("/api/bootstrap", controller.signal);

        startTransition(() => {
          setMunicipalities(response.data.municipalities);
          setMunicipalityGeometry(response.data.municipalityGeometry);
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
    if (isBootLoading || !municipalityGeometry || hasHydratedQueryRef.current) {
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

  async function handleCopyContextLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch (_error) {
      setCopyState("error");
    }
  }

  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,201,120,0.18),_transparent_30%),linear-gradient(180deg,#f8f2e8_0%,#f3eee5_100%)] md:grid-cols-[390px_1fr]">
      <aside className="flex min-h-screen flex-col gap-6 border-b border-stone-200/70 px-5 py-6 md:border-b-0 md:border-r md:px-7">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-stone-300 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500 backdrop-blur">
            Deaf Territory
          </div>
          <h1 className="max-w-sm text-4xl font-semibold leading-tight text-stone-950">Iloilo</h1>
        </div>

        <div className="space-y-4 rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_18px_40px_rgba(41,37,36,0.08)] backdrop-blur">
          <SearchBox
            value={searchQuery}
            onChange={(value) => {
              setSearchError(null);
              setSearchQuery(value);
            }}
            placeholder="Search"
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
              className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
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
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bootError}</div>
        ) : null}
        {selectionError ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {selectionError}
          </div>
        ) : null}
        {searchError ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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

      <section className="flex min-h-screen flex-col px-5 py-6 md:px-6">
        <div className="mb-4 rounded-[28px] border border-stone-200 bg-white/70 px-5 py-4 shadow-[0_18px_40px_rgba(41,37,36,0.06)] backdrop-blur">
          <p className="text-lg font-medium text-stone-900">
            {selectedBarangay
              ? selectedBarangay.displayName
              : selectedMunicipalityFeature
                ? `${selectedMunicipalityFeature.properties.name}, Iloilo`
                : "Iloilo"}
          </p>
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
