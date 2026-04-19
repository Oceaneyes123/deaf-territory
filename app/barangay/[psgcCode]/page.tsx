import MapView from "@/components/map/MapView";

type BarangayDetailPageProps = {
  params: Promise<{ psgcCode: string }>;
};

export default async function BarangayDetailPage({ params }: BarangayDetailPageProps) {
  const { psgcCode } = await params;

  return <MapView initialBarangayCode={psgcCode} />;
}
