"use client";

type MunicipalityOption = {
  code: string;
  name: string;
};

type MunicipalitySelectProps = {
  municipalities: MunicipalityOption[];
  value: string[];
  loading?: boolean;
  onToggle: (code: string) => void;
};

export default function MunicipalitySelect({
  municipalities,
  value,
  loading = false,
  onToggle,
}: MunicipalitySelectProps) {
  const selectedSet = new Set(value);

  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Municipality / City</span>
      <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-stone-300 bg-white/90 p-2">
        {municipalities.map((municipality) => (
          <button
            key={municipality.code}
            type="button"
            disabled={loading}
            onClick={() => onToggle(municipality.code)}
            className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left text-sm text-stone-900 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100"
          >
            <span>{municipality.name}</span>
            <span className="text-xs font-semibold text-stone-500">{selectedSet.has(municipality.code) ? "Selected" : ""}</span>
          </button>
        ))}
      </div>
    </label>
  );
}
