// Shared bits for the public read-only JSON API.
export const API_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: API_HEADERS });

export const apiError = (message: string, status: number) => json({ error: message }, status);
