export function MapShell({ title = 'Philippines map shell' }: { title?: string }) {
  return (
    <section className="relative h-full min-h-[420px] rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </header>
      <div className="grid h-[calc(100%-57px)] place-content-center p-6 text-center text-sm text-slate-500">
        Interactive map layer placeholder
      </div>
    </section>
  );
}
