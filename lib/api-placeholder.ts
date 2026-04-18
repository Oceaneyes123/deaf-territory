export type PlaceholderPayload = {
  message: string;
  route: string;
  timestamp: string;
};

export function makePlaceholderPayload(route: string, message: string): PlaceholderPayload {
  return {
    route,
    message,
    timestamp: new Date().toISOString(),
  };
}
