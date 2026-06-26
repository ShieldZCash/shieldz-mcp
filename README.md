# @shieldz/mcp

[![npm](https://img.shields.io/npm/v/@shieldz/mcp.svg)](https://www.npmjs.com/package/@shieldz/mcp)

**Model Context Protocol (MCP) server for [Shieldz](https://shieldz.cash).** Lets an AI agent (Claude, etc.) create and look up non-custodial crypto payment invoices.

Tools: `create_invoice`, `get_invoice`, `list_invoices`.

## Use with Claude Desktop / any MCP client

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

Get an API key from your [merchant dashboard](https://merchant.shieldz.cash) → Developers. Funds settle to your own wallet — Shieldz is non-custodial and never holds your keys.

## License

MIT © Deniz Yanbollu / Shieldz
