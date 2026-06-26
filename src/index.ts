#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Shieldz from "@shieldz/sdk";

const apiKey = process.env.SHIELDZ_API_KEY;
if (!apiKey) {
  console.error("shieldz-mcp: set SHIELDZ_API_KEY (sk_live_… or sk_test_…)");
  process.exit(1);
}

const shieldz = new Shieldz(apiKey);
const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: "shieldz", version: "0.1.0" });

server.tool(
  "create_invoice",
  "Create a Shieldz crypto payment invoice. Returns a pay_url to send the customer to. Non-custodial: funds settle to the merchant's own wallet.",
  {
    amount_usd_cents: z.number().int().min(100).max(10_000_000).describe("Amount in USD cents (100 = $1.00)"),
    memo: z.string().optional().describe("Description shown on the invoice"),
    customer_email: z.string().email().optional(),
    metadata: z.record(z.any()).optional().describe("Arbitrary JSON, echoed back on webhooks"),
    idempotency_key: z.string().optional(),
  },
  async (args) => json(await shieldz.invoices.create(args)),
);

server.tool(
  "get_invoice",
  "Retrieve a Shieldz invoice by its id, including current status (pending/paid/expired/failed).",
  { id: z.string().describe("The invoice id") },
  async ({ id }) => json(await shieldz.invoices.retrieve(id)),
);

server.tool(
  "list_invoices",
  "List recent Shieldz invoices, newest first.",
  {
    limit: z.number().int().min(1).max(100).optional(),
    status: z.enum(["pending", "paid", "expired", "failed"]).optional(),
    starting_after: z.string().optional(),
  },
  async (args) => json(await shieldz.invoices.list(args)),
);

await server.connect(new StdioServerTransport());
console.error("shieldz-mcp running on stdio");
