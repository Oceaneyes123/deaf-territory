import { MapShell } from '@/components/map-shell';
import { SidebarShell } from '@/components/sidebar-shell';

export default function HomePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-4 p-4 md:grid-cols-[320px_1fr]">
      <SidebarShell />
      <MapShell />
    </main>
  );
}
