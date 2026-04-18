import { MapShell } from '@/components/map-shell';
import { SidebarShell } from '@/components/sidebar-shell';

type BarangayDetailPageProps = {
  params: Promise<{ psgcCode: string }>;
};

export default async function BarangayDetailPage({ params }: BarangayDetailPageProps) {
  const { psgcCode } = await params;

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-4 p-4 md:grid-cols-[320px_1fr]">
      <SidebarShell selectedPsgcCode={psgcCode} />
      <section className="space-y-4">
        <MapShell title="Selected barangay context map" />
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Barangay {psgcCode}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Deep-link placeholder page. Add demographic panels, accessibility resources, and related municipality data here.
          </p>
        </article>
      </section>
    </main>
  );
}
