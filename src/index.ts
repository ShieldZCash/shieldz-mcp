#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// @shieldz/sdk is only needed for the API-key invoice tools. It is imported
// lazily (below, when SHIELDZ_API_KEY is set) so keyless mode boots instantly
// without loading it — the common case, and what directory scanners launch.

const BASE = (process.env.SHIELDZ_BASE_URL || "https://shieldz.cash").replace(/\/+$/, "");
const apiKey = process.env.SHIELDZ_API_KEY;

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

async function call(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const e = (data as { error?: { message?: string; code?: string } }).error;
    throw new Error(e?.message ? `${e.message}${e.code ? ` (${e.code})` : ""}` : `HTTP ${res.status}`);
  }
  return data;
}

const Chain = z
  .enum(["base", "arbitrum", "optimism", "polygon", "ethereum"])
  .describe("Settlement chain. Funds settle to your own wallet on this chain.");
const Asset = z.enum(["USDC", "USDT"]).describe("Stablecoin to settle in");
const Address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x EVM address")
  .describe("Destination wallet; funds settle here. Shieldz never holds them.");

const server = new McpServer({ name: "shieldz", version: "0.4.0" });

// ─── Keyless, zero-setup tools (no API key required) ──────────────────────
// These let an agent start accepting crypto with nothing but a wallet address.

server.tool(
  "create_payment_link",
  "Create a one-time crypto payment link with ZERO setup, no account, no API key. Give a destination wallet address and an amount; get back a shareable pay_url, an embeddable button, and a manage_url. Non-custodial: funds settle directly to the address you provide. Optionally pass an email so the owner can claim a full dashboard later.",
  {
    address: Address,
    amount_usd: z.number().positive().max(100_000).describe("Amount in USD, e.g. 49 for $49.00"),
    chain: Chain.optional().describe("Defaults to base"),
    asset: Asset.optional().describe("Defaults to USDC"),
    memo: z.string().max(500).optional().describe("Description shown on the checkout"),
    email: z.string().email().optional().describe("Optional, lets the owner claim a dashboard later"),
  },
  async (a) =>
    json(
      await call("/api/v1/links", {
        method: "POST",
        body: JSON.stringify({
          settlement: { chain: a.chain ?? "base", asset: a.asset ?? "USDC", address: a.address },
          amount_usd_cents: Math.round(a.amount_usd * 100),
          memo: a.memo,
          email: a.email,
        }),
      }),
    ),
);

server.tool(
  "create_tip_jar",
  "Create a reusable 'pay what you want' tip jar with ZERO setup, no account, no API key. The payer chooses the amount. Returns a shareable /tip url, an embeddable button, and a manage_url. Idempotent per wallet address: calling again updates the same tip jar. Non-custodial: funds settle directly to the address you provide.",
  {
    address: Address,
    chain: Chain.optional().describe("Defaults to base"),
    asset: Asset.optional().describe("Defaults to USDC"),
    title: z.string().max(120).optional().describe("Heading shown on the tip page, e.g. 'Buy me a coffee'"),
    description: z.string().max(4000).optional(),
    suggested_amounts_usd: z
      .array(z.number().positive().max(100_000))
      .max(8)
      .optional()
      .describe("Preset amount buttons in USD, e.g. [3, 5, 10]"),
    slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,62}$/).optional().describe("Optional custom URL slug; auto-generated if omitted"),
    email: z.string().email().optional().describe("Optional, lets the owner claim a dashboard later"),
  },
  async (a) =>
    json(
      await call("/api/v1/tip-jars", {
        method: "POST",
        body: JSON.stringify({
          settlement: { chain: a.chain ?? "base", asset: a.asset ?? "USDC", address: a.address },
          title: a.title,
          description: a.description,
          suggested_amounts_usd_cents: a.suggested_amounts_usd?.map((v) => Math.round(v * 100)),
          slug: a.slug,
          email: a.email,
        }),
      }),
    ),
);

server.tool(
  "create_unlock",
  "Create a keyless pay-to-unlock page with ZERO setup, no account, no API key: sell a file link, license key, or secret text (up to 100,000 chars) for a fixed price. The buyer pays the set USD price straight to your wallet and the payload is revealed on their paid confirmation, never before. Non-custodial. (To deliver an actual uploaded file up to 10MB, use the multipart HTTP API at /api/v1/unlocks.) IMPORTANT: confirm with your principal that the content is not adult, illegal, or non-consensual, then pass aup_accepted=true, otherwise the call fails.",
  {
    address: Address,
    price_usd: z.number().positive().max(100_000).describe("Unlock price in USD, e.g. 5 for $5.00"),
    payload: z.string().min(1).max(100_000).describe("The secret to reveal after payment: a URL or text. Never shown before payment."),
    title: z.string().max(120).optional().describe("What the buyer is purchasing, shown on the paywall"),
    description: z.string().max(500).optional().describe("Short pitch shown on the paywall"),
    chain: Chain.optional().describe("Defaults to base"),
    asset: Asset.optional().describe("Defaults to USDC"),
    email: z.string().email().optional().describe("Optional, lets the owner claim a dashboard later"),
    aup_accepted: z.boolean().describe("Must be true: asserts the content complies with the acceptable-use policy (no adult, illegal, or non-consensual content)."),
  },
  async (a) =>
    json(
      await call("/api/v1/unlocks", {
        method: "POST",
        body: JSON.stringify({
          to: a.address,
          chain: a.chain ?? "base",
          asset: a.asset ?? "USDC",
          price_usd_cents: Math.round(a.price_usd * 100),
          payload: a.payload,
          title: a.title,
          description: a.description,
          email: a.email,
          aup_accepted: a.aup_accepted === true,
        }),
      }),
    ),
);

server.tool(
  "get_account_status",
  "Look up a keyless Shieldz account by its manage_token (returned when you create a payment link, tip jar, or unlock). Returns settlement details, tip jars, totals (paid/pending), and the full invoice list as structured JSON.",
  { manage_token: z.string().describe("The manage_token from create_payment_link / create_tip_jar / create_unlock") },
  async ({ manage_token }) => json(await call(`/a/${encodeURIComponent(manage_token)}.json`)),
);

// ─── API-key tools (registered only when SHIELDZ_API_KEY is set) ──────────
// For merchants with a full account: richer invoice management via @shieldz/sdk.

if (apiKey) {
  const { default: Shieldz } = await import("@shieldz/sdk");
  const shieldz = new Shieldz(apiKey);

  server.tool(
    "create_invoice",
    "Create a Shieldz crypto payment invoice (requires an API key). Returns a pay_url to send the customer to. Non-custodial: funds settle to the merchant's own wallet.",
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
}

await server.connect(new StdioServerTransport());
console.error(
  `shieldz-mcp running on stdio, base ${BASE}${apiKey ? " (API key set: invoice tools enabled)" : " (keyless mode)"}`,
);
