import { json } from "@/lib/api";

const Product = {
  type: "object",
  properties: {
    id: { type: "integer", example: 123 },
    source: { type: "string", enum: ["books-toscrape", "coingecko", "tcmb", "gold"], example: "coingecko" },
    title: { type: "string", example: "Bitcoin (BTC)" },
    url: { type: "string", format: "uri" },
    image_url: { type: "string", format: "uri", nullable: true },
    currency: { type: "string", example: "USD" },
    price: { type: "number", nullable: true, example: 121480.5 },
    previous_price: { type: "number", nullable: true, description: "Price at the scrape before the latest one" },
    price_change: { type: "number", nullable: true, description: "price - previous_price" },
    in_stock: { type: "boolean", nullable: true },
    scraped_at: { type: "string", format: "date-time", nullable: true },
  },
};

const Error = { type: "object", properties: { error: { type: "string" } } };
const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});
const idParam = {
  name: "id",
  in: "path",
  required: true,
  description: "Item id from /api/products (ids are not sequential). 123 is Bitcoin.",
  schema: { type: "integer", minimum: 1 },
  example: 123,
};

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Price Tracker API",
    version: "1.0.0",
    description:
      "Read-only access to the prices this project scrapes every day: books, crypto, exchange rates and gold. No key needed; responses are cached for 60 seconds.",
  },
  paths: {
    "/api/products": {
      get: {
        tags: ["Prices"],
        summary: "List tracked items with their latest price",
        parameters: [
          { name: "source", in: "query", schema: Product.properties.source },
          { name: "q", in: "query", description: "Case-insensitive title search", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
        ],
        responses: {
          "200": {
            description: "Items, biggest price drop first",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { count: { type: "integer" }, items: { type: "array", items: { $ref: "#/components/schemas/Product" } } },
                },
              },
            },
          },
          "400": errorResponse("Invalid query parameter"),
        },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Prices"],
        summary: "Get one item",
        parameters: [idParam],
        responses: {
          "200": { description: "The item", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
          "404": errorResponse("No item with this id"),
        },
      },
    },
    "/api/products/{id}/history": {
      get: {
        tags: ["Prices"],
        summary: "Price history of one item",
        parameters: [idParam, { name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 365, default: 90 } }],
        responses: {
          "200": {
            description: "One point per scrape, oldest first",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    currency: { type: "string" },
                    days: { type: "integer" },
                    points: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          scraped_at: { type: "string", format: "date-time" },
                          price: { type: "number", nullable: true },
                          in_stock: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid id or days"),
          "404": errorResponse("No item with this id"),
        },
      },
    },
  },
  components: { schemas: { Product, Error } },
};

export function GET() {
  return json(spec);
}
