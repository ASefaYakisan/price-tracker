// Shared bits for the public read-only JSON API.
export const API_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: API_HEADERS });

export const apiError = (message: string, status: number) => json({ error: message }, status);

// Answers about one person's pasted link: only that person's browser may keep them, and no cross-site reads.
export const PRIVATE_HEADERS = { "cache-control": "private, no-store" };

export const privateJson = (data: unknown, status = 200) => Response.json(data, { status, headers: PRIVATE_HEADERS });

// An item's answer: cached for everyone when it is shared, private when it is someone's pasted link or a 404
// (which could be a private item the caller cannot see, so a shared cache must not remember it).
export const itemJson = (data: unknown, shared: boolean) => (shared ? json(data) : privateJson(data));
export const itemNotFound = () => privateJson({ error: "product not found" }, 404);
