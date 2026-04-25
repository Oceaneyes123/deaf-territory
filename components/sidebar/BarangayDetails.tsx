"use client";

import Link from "next/link";

import type { BarangayDetail } from "@/lib/territory-types";

type BarangayDetailsProps = {
  barangay: BarangayDetail | null;
  loading?: boolean;
  onCopyLink?: () => void;
  copyState?: "idle" | "copied" | "error";
};

function formatNumber(value: number | null, digits: number): string {
  if (value === null) {
    return "Unavailable";
  }

  return value.toFixed(digits);
}

export default function BarangayDetails({
  barangay,
  loading = false,
  onCopyLink,
  copyState = "idle",
}: BarangayDetailsProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </section>
    );
  }

  if (!barangay) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Selected barangay</p>
      <h2 className="mt-2 text-xl font-bold leading-tight text-slate-950">{barangay.name}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-500">{barangay.displayName}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">PSGC</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{barangay.psgcCode}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Municipality</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{barangay.municipalityName}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Province</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{barangay.provinceName}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Area</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(barangay.areaSqKm, 2)} km2</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Centroid</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {formatNumber(barangay.centroid[1], 5)}, {formatNumber(barangay.centroid[0], 5)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/barangay/${barangay.psgcCode}`}
          className="rounded-lg bg-slate-950 px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Page
        </Link>
        <button
          type="button"
          onClick={onCopyLink}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {copyState === "copied" ? "Link copied" : copyState === "error" ? "Copy failed" : "Copy link"}
        </button>
        <a
          href={`https://www.openstreetmap.org/?mlat=${barangay.centroid[1]}&mlon=${barangay.centroid[0]}#map=15/${barangay.centroid[1]}/${barangay.centroid[0]}`}
          target="_blank"
          rel="noreferrer"
          className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Open in OSM
        </a>
      </div>
    </section>
  );
}
