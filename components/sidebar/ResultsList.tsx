"use client";

type ResultItem = {
  code: string;
  name: string;
  municipalityName?: string;
  displayName?: string;
};

type ResultsListProps = {
  title: string;
  items: ResultItem[];
  selectedCode: string | null;
  emptyMessage: string;
  onSelect: (psgcCode: string) => void;
};

export default function ResultsList({
  title,
  items,
  selectedCode,
  emptyMessage,
  onSelect,
}: ResultsListProps) {
  const showEmptyState = items.length === 0 && emptyMessage.trim().length > 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{title}</h2>
        <span className="text-xs text-stone-400">{items.length}</span>
      </div>

      {showEmptyState ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100/80 text-stone-500"
            >
              •
            </span>
            <p className="text-sm font-medium leading-6 text-stone-600">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const isSelected = item.code === selectedCode;

            return (
              <li key={item.code}>
                <button
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-amber-700 bg-amber-50 text-stone-950 shadow-[0_10px_24px_rgba(146,64,14,0.12)]"
                      : "border-stone-200 bg-white/85 text-stone-700 hover:border-stone-300 hover:bg-white"
                  }`}
                  onClick={() => onSelect(item.code)}
                >
                  <div className="font-medium">{item.name}</div>
                  <div className="mt-1 text-sm text-stone-500">
                    {item.displayName ?? [item.municipalityName, "Iloilo"].filter(Boolean).join(", ")}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
