import MapView from "@/components/map/MapView";

type HomePageProps = {
  searchParams: Promise<{ m?: string; b?: string }>;
};

function parseMunicipalityCodes(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return Array.from(new Set(rawValue.split(",").map((code) => code.trim()).filter(Boolean)));
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <MapView
      initialQueryMunicipalityCodes={parseMunicipalityCodes(params.m)}
      initialQueryBarangayCode={params.b ?? null}
    />
  );
}
