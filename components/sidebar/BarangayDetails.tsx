"use client";

import Link from "next/link";

import type { BarangayDetail } from "@/lib/territory-types";

type BarangayDetailsProps = {
  barangay: BarangayDetail | null;
  loading?: boolean;
};

function formatNumber(value: number | null, digits: number): string {
  if (value === null) {
    return "Unavailable";
  }

  return value.toFixed(digits);
}

export default function BarangayDetails({ barangay, loading = false }: BarangayDetailsProps) {
  if (loading) {
    return (
      <section className="rounded-[28px] border border-stone-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(41,37,36,0.08)]">
        <p className="text-sm text-stone-500">Loading…</p>
      </section>
    );
  }

  if (!barangay) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/95 p-5 shadow-[0_18px_40px_rgba(41,37,36,0.08)]">
      <h2 className="text-2xl font-semibold text-stone-950">{barangay.name}</h2>
      <p className="mt-1 text-sm text-stone-500">{barangay.displayName}</p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">PSGC Code</dt>
          <dd className="mt-1 text-sm font-medium text-stone-900">{barangay.psgcCode}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Municipality / City</dt>
          <dd className="mt-1 text-sm font-medium text-stone-900">{barangay.municipalityName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Province</dt>
          <dd className="mt-1 text-sm font-medium text-stone-900">{barangay.provinceName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Region</dt>
          <dd className="mt-1 text-sm font-medium text-stone-900">{barangay.regionName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Area</dt>
          <dd className="mt-1 text-sm font-medium text-stone-900">{formatNumber(barangay.areaSqKm, 2)} km²</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Centroid</dt>
          <dd className="mt-1 text-sm font-medium text-stone-900">
            {formatNumber(barangay.centroid[1], 5)}, {formatNumber(barangay.centroid[0], 5)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/barangay/${barangay.psgcCode}`}
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
        >
          Page
        </Link>
        <a
          href={`https://www.openstreetmap.org/?mlat=${barangay.centroid[1]}&mlon=${barangay.centroid[0]}#map=15/${barangay.centroid[1]}/${barangay.centroid[0]}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
        >
          OSM
        </a>
      </div>
    </section>
  );
}
