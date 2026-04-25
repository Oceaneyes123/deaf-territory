"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MunicipalityOption = {
  code: string;
  name: string;
};

type MunicipalitySelectProps = {
  municipalities: MunicipalityOption[];
  value: string[];
  loading?: boolean;
  onChange: (codes: string[]) => void;
};

export default function MunicipalitySelect({
  municipalities,
  value,
  loading = false,
  onChange,
}: MunicipalitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filteredMunicipalities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return municipalities;
    }

    return municipalities.filter((municipality) => municipality.name.toLowerCase().includes(normalizedQuery));
  }, [municipalities, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  function toggleMunicipality(code: string) {
    if (selectedSet.has(code)) {
      onChange(value.filter((currentCode) => currentCode !== code));
      return;
    }

    onChange([...value, code]);
  }

  function clearAllMunicipalities() {
    onChange([]);
  }

  const selectedMunicipalities = municipalities.filter((municipality) => selectedSet.has(municipality.code));

  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Municipality / City</span>

      <div className="space-y-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setIsOpen((current) => !current);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-900 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{value.length > 0 ? `${value.length} municipality${value.length === 1 ? "" : "ies"} selected` : "Select municipalities"}</span>
          <span className="text-xs text-stone-500">{isOpen ? "Close" : "Open"}</span>
        </button>

        {isOpen ? (
          <div
            className="space-y-2 rounded-2xl border border-stone-300 bg-white/90 p-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setIsOpen(false);
              }
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search municipalities"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none ring-stone-400 placeholder:text-stone-400 focus:ring-2"
            />
            <ul role="listbox" aria-multiselectable="true" className="max-h-52 space-y-1 overflow-y-auto">
              {filteredMunicipalities.map((municipality) => {
                const isSelected = selectedSet.has(municipality.code);

                return (
                  <li key={municipality.code}>
                    <button
                      type="button"
                      disabled={loading}
                      aria-pressed={isSelected}
                      onClick={() => toggleMunicipality(municipality.code)}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-stone-900 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100"
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-4 w-4 flex-none items-center justify-center rounded border ${
                          isSelected ? "border-stone-700 bg-stone-700 text-white" : "border-stone-400 bg-white"
                        }`}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="flex-1">{municipality.name}</span>
                    </button>
                  </li>
                );
              })}
              {filteredMunicipalities.length === 0 ? (
                <li className="rounded-xl px-3 py-2 text-sm text-stone-500">No matching municipalities.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedMunicipalities.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedMunicipalities.map((municipality) => (
              <span
                key={municipality.code}
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-xs text-stone-700"
              >
                <span>{municipality.name}</span>
                <button
                  type="button"
                  onClick={() => toggleMunicipality(municipality.code)}
                  className="rounded-full border border-stone-300 px-1.5 text-[11px] leading-4 text-stone-600 transition hover:border-stone-400 hover:bg-white"
                  aria-label={`Remove ${municipality.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={clearAllMunicipalities}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 transition hover:text-stone-700"
          >
            Clear all municipalities
          </button>
        </div>
      ) : null}
    </div>
  );
}
