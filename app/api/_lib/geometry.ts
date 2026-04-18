import type { PolygonGeometry, Position } from "../_data/iloilo";

const MAX_RING_POINTS = 200;
const MAX_SERIALIZED_BYTES = 50_000;
const textEncoder = new TextEncoder();

function thinRing(ring: Position[], maxPoints: number): Position[] {
  if (ring.length <= maxPoints) {
    return ring;
  }

  const stride = Math.ceil(ring.length / maxPoints);
  const reduced = ring.filter((_, index) => index % stride === 0);

  const first = reduced[0];
  const last = reduced[reduced.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    reduced.push(first);
  }

  return reduced;
}

function getSerializedSize(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).length;
}

export function simplifyGeometry(geometry: PolygonGeometry): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: geometry.coordinates.map((ring) => thinRing(ring, MAX_RING_POINTS)),
  };
}

export function enforceGeometrySizeLimit(geometry: PolygonGeometry): PolygonGeometry | null {
  if (getSerializedSize(geometry) <= MAX_SERIALIZED_BYTES) {
    return geometry;
  }

  const reduced = {
    type: "Polygon" as const,
    coordinates: geometry.coordinates.map((ring) => thinRing(ring, Math.floor(MAX_RING_POINTS / 4))),
  };

  if (getSerializedSize(reduced) > MAX_SERIALIZED_BYTES) {
    return null;
  }

  return reduced;
}
