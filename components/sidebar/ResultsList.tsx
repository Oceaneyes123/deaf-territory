"use client";

type ResultItem = {
  code: string;
  name: string;
  municipalityName?: string;
};

type ResultsListProps = {
  items: ResultItem[];
  selectedCode: string | null;
  onSelect: (psgcCode: string) => void;
};

export default function ResultsList({ items, selectedCode, onSelect }: ResultsListProps) {
  return (
    <ul className="results-list">
      {items.map((item) => (
        <li key={item.code}>
          <button
            type="button"
            className={item.code === selectedCode ? "selected" : ""}
            onClick={() => onSelect(item.code)}
          >
            <span>{item.name}</span>
            {item.municipalityName ? <small>{item.municipalityName}</small> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
