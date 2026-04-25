import MapView from "@/components/map/MapView";

type HomePageProps = {
  searchParams: Promise<{ m?: string; b?: string }>;
};

function parseMunicipalityCode(rawValue?: string): string | null {
  if (!rawValue) {
    return null;
  }

  return rawValue.split(",")[0]?.trim() || null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <MapView
      initialQueryMunicipalityCode={parseMunicipalityCode(params.m)}
      initialQueryBarangayCode={params.b ?? null}
    />
  );
}
