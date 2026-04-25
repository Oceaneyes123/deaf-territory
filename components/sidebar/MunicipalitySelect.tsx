"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MunicipalityOption = {
  code: string;
  name: string;
};

type MunicipalitySelectProps = {
  municipalities: MunicipalityOption[];
  value: string | null;
  loading?: boolean;
  onChange: (code: string | null) => void;
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

  const selectedMunicipality = useMemo(
    () => municipalities.find((municipality) => municipality.code === value) ?? null,
    [municipalities, value],
  );

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

  function selectMunicipality(code: string) {
    onChange(code);
    setIsOpen(false);
  }

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
          <span>{selectedMunicipality?.name ?? "Select municipality"}</span>
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
            <ul role="listbox" className="max-h-52 space-y-1 overflow-y-auto">
              {filteredMunicipalities.map((municipality) => {
                const isSelected = value === municipality.code;

                return (
                  <li key={municipality.code}>
                    <button
                      type="button"
                      disabled={loading}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectMunicipality(municipality.code)}
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

      {selectedMunicipality ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 transition hover:text-stone-700"
        >
          Clear municipality
        </button>
      ) : null}
    </div>
  );
}
