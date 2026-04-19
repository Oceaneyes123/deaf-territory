"use client";

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
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Municipality / City</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={loading}
        className="h-12 w-full rounded-2xl border border-stone-300 bg-white/90 px-4 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-stone-100"
      >
        <option value="">All municipalities</option>
        {municipalities.map((municipality) => (
          <option key={municipality.code} value={municipality.code}>
            {municipality.name}
          </option>
        ))}
      </select>
    </label>
  );
}
