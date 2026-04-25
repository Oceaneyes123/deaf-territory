import MapView from "@/components/map/MapView";

type BarangayDetailPageProps = {
  params: Promise<{ psgcCode: string }>;
  searchParams: Promise<{ m?: string; b?: string }>;
};

function parseMunicipalityCode(rawValue?: string): string | null {
  if (!rawValue) {
    return null;
  }

  return rawValue.split(",")[0]?.trim() || null;
}

export default async function BarangayDetailPage({ params, searchParams }: BarangayDetailPageProps) {
  const { psgcCode } = await params;
  const query = await searchParams;

  return (
    <MapView
      initialBarangayCode={psgcCode}
      initialQueryMunicipalityCode={parseMunicipalityCode(query.m)}
      initialQueryBarangayCode={query.b ?? null}
    />
  );
}
