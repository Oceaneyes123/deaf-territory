"use client";

type BarangaySummary = {
  code: string;
  name: string;
  municipality?: string;
};

type BarangayDetailsProps = {
  barangay: BarangaySummary | null;
};

export default function BarangayDetails({ barangay }: BarangayDetailsProps) {
  if (!barangay) {
    return <section className="barangay-details">Select a barangay to view details.</section>;
  }

  return (
    <section className="barangay-details" aria-live="polite">
      <h2>{barangay.name}</h2>
      <dl>
        <div>
          <dt>PSGC code</dt>
          <dd>{barangay.code}</dd>
        </div>
        {barangay.municipality ? (
          <div>
            <dt>Municipality</dt>
            <dd>{barangay.municipality}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
