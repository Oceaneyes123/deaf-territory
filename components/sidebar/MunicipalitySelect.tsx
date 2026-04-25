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
    <div className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Municipality / City</span>

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
          className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-950 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{selectedMunicipality?.name ?? "Select municipality"}</span>
          <span aria-hidden="true" className="text-slate-400">{isOpen ? "↑" : "↓"}</span>
        </button>

        {isOpen ? (
          <div
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-950/5"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
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
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-900 transition hover:border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-4 w-4 flex-none items-center justify-center rounded border ${
                          isSelected ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white"
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
                <li className="rounded-lg px-3 py-2 text-sm text-slate-500">No matching municipalities.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedMunicipality ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-800"
        >
          Clear municipality
        </button>
      ) : null}
    </div>
  );
}
