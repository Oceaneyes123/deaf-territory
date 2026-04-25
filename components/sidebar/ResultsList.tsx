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
  isLoading?: boolean;
  onSelect: (psgcCode: string) => void;
};

export default function ResultsList({
  title,
  items,
  selectedCode,
  emptyMessage,
  isLoading = false,
  onSelect,
}: ResultsListProps) {
  const showEmptyState = items.length === 0 && emptyMessage.trim().length > 0;

  return (
    <section className="flex min-h-0 max-h-64 flex-1 flex-col overflow-hidden lg:max-h-none">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h2>
          {isLoading ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" role="status" aria-live="polite">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent"
              />
              Searching...
            </span>
          ) : null}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{items.length}</span>
      </div>

      {showEmptyState ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500"
            >
              •
            </span>
            <p className="text-sm font-medium leading-6 text-slate-600">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const isSelected = item.code === selectedCode;

            return (
              <li key={item.code}>
                <button
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition [content-visibility:auto] ${
                    isSelected
                      ? "border-amber-600 bg-amber-50 text-slate-950 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => onSelect(item.code)}
                >
                  <div className="text-sm font-bold">{item.name}</div>
                  <div className="mt-0.5 text-xs leading-5 text-slate-500">
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
