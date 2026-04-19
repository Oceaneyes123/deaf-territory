const textEncoder = new TextEncoder();

function getSerializedSize(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).length;
}

export function enforcePayloadSizeLimit<T>(payload: T, maxBytes: number): T | null {
  if (getSerializedSize(payload) > maxBytes) {
    return null;
  }

  return payload;
}
