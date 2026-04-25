import MapView from "@/components/map/MapView";

type BarangayDetailPageProps = {
  params: Promise<{ psgcCode: string }>;
  searchParams: Promise<{ m?: string; b?: string }>;
};

function parseMunicipalityCodes(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return Array.from(new Set(rawValue.split(",").map((code) => code.trim()).filter(Boolean)));
}

export default async function BarangayDetailPage({ params, searchParams }: BarangayDetailPageProps) {
  const { psgcCode } = await params;
  const query = await searchParams;

  return (
    <MapView
      initialBarangayCode={psgcCode}
      initialQueryMunicipalityCodes={parseMunicipalityCodes(query.m)}
      initialQueryBarangayCode={query.b ?? null}
    />
  );
}
