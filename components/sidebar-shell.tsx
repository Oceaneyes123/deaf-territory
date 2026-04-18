import Link from 'next/link';

export function SidebarShell({ selectedPsgcCode }: { selectedPsgcCode?: string }) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Deaf Territory</h1>
      <p className="mt-1 text-sm text-slate-600">Search and review municipality and barangay details.</p>

      <div className="mt-5 space-y-2 text-sm">
        <p className="font-medium text-slate-700">Quick links</p>
        <ul className="space-y-1 text-blue-700">
          <li>
            <Link href="/barangay/137404001" className="hover:underline">
              Sample Barangay 137404001
            </Link>
          </li>
        </ul>
      </div>

      {selectedPsgcCode && (
        <div className="mt-5 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          Viewing PSGC code: <span className="font-semibold">{selectedPsgcCode}</span>
        </div>
      )}
    </aside>
  );
}
