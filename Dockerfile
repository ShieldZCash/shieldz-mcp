FROM node:20-alpine
LABEL org.opencontainers.image.source="https://github.com/ShieldZCash/shieldz-mcp"
LABEL org.opencontainers.image.description="MCP server for Shieldz, non-custodial crypto payments"
LABEL org.opencontainers.image.licenses="MIT"
RUN npm install -g @shieldz/mcp
ENTRYPOINT ["shieldz-mcp"]
