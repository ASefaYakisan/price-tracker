// Swagger UI for /api/openapi.json, loaded from a CDN so it adds nothing to the app bundle.
const VERSION = "5.33.1";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Price Tracker API docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}/swagger-ui.css" />
  <style>body { margin: 0 } .topbar { display: none }</style>
</head>
<body>
  <div id="swagger"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#swagger", deepLinking: true, tryItOutEnabled: true });</script>
</body>
</html>`;

export function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
