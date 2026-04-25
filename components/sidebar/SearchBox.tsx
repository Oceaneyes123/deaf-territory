"use client";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBox({ value, onChange, placeholder = "Search" }: SearchBoxProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Search barangay</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
      />
    </label>
  );
}
