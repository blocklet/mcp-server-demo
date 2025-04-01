# Demo MCP Server

A demo blocklet that hosts a MCP server

This project was bootstrapped with [Create Blocklet](https://github.com/blocklet/create-blocklet).

This blocklet is a dapp project, which means this is a full-stack application. It's contained both `server` and `client` code.

The MCP Server uses the `@blocklet/mcp` package to do authenticate and authorization.

## Requirements

- Node.js version: >= 20.14.0
- Server version: >= 1.16.28

## Blocklet as a MCP server

- Set `blocklet.yml#capabilities.mcp` to `true`
- Setup your MCP server in `api/src/mcp/server.ts`
- Setup sse transport in `api/src/mcp/sse.ts`, the endpoint must be `/mcp/sse`
- Attach the MCP Server to your app in `api/src/index.ts`
- Use https://dev.store.blocklet.dev/blocklets/z2qZwzdTFvPFN275o7wm4WwXTAVBvdSfHSDqq to debug your MCP server

## License

The code is licensed under the Apache 2.0 license found in the
[LICENSE](LICENSE) file.
