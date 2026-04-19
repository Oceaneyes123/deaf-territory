"use client";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBox({ value, onChange, placeholder = "Search" }: SearchBoxProps) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Barangay Search</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-stone-300 bg-white/90 px-4 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-200"
      />
    </label>
  );
}
