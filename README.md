# @shieldz/mcp

[![npm](https://img.shields.io/npm/v/@shieldz/mcp.svg)](https://www.npmjs.com/package/@shieldz/mcp)

**Model Context Protocol (MCP) server for [Shieldz](https://shieldz.cash).** Lets an AI agent (Claude, etc.) accept non-custodial crypto payments.

Funds always settle to the wallet address you provide. Shieldz never holds your keys.

## Keyless tools (no account, no API key)

Give a destination wallet address and start accepting crypto in one call:

- `create_payment_link` — a one-time payment link (shareable URL + embeddable button + QR). Args: `address`, `amount_usd`, optional `chain` (default `base`), `asset` (default `USDC`), `memo`, `email`.
- `create_tip_jar` — a reusable "pay what you want" page; the payer chooses the amount. Args: `address`, optional `chain`, `asset`, `title`, `suggested_amounts_usd`, `slug`, `email`.
- `get_account_status` — look up settlement details, tip jars, totals, and invoices by `manage_token`.

These work with **zero configuration**. Pass an optional `email` so the owner can claim a full dashboard later via magic link.

**Remote (no install)** — point any MCP client at the hosted server:

```json
{ "mcpServers": { "shieldz": { "url": "https://shieldz.cash/mcp" } } }
```

**Local (stdio)** — run via npx:

```json
{
  "mcpServers": {
    "shieldz": {
      "command": "npx",
      "args": ["-y", "@shieldz/mcp"]
    }
  }
}
```

## API-key tools (full merchant account)

Set `SHIELDZ_API_KEY` to additionally enable richer invoice management: `create_invoice`, `get_invoice`, `list_invoices`.

```json
{
  "mcpServers": {
    "shieldz": {
      "command": "npx",
      "args": ["-y", "@shieldz/mcp"],
      "env": { "SHIELDZ_API_KEY": "sk_live_…" }
    }
  }
}
```

Get an API key from your [merchant dashboard](https://merchant.shieldz.cash) → Developers.

### Environment

- `SHIELDZ_API_KEY` (optional) — enables the invoice tools. Omit for keyless mode.
- `SHIELDZ_BASE_URL` (optional) — defaults to `https://shieldz.cash`.

## License

MIT © Deniz Yanbollu / Shieldz
