"use client";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBox({ value, onChange, placeholder = "Search" }: SearchBoxProps) {
  return (
    <label className="search-box">
      <span className="sr-only">Search</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
