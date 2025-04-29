import type { McpServer } from '@blocklet/mcp/server/mcp.js';
import { StreamableHTTPServerTransport } from '@blocklet/mcp/server/streamableHttp.js';
import session from '@blocklet/sdk/lib/middlewares/session';
import { Express, Request, Response } from 'express';

const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // set to undefined for stateless servers
});

export async function attachMcpServer(mcpServer: McpServer) {
  await mcpServer.connect(transport);
}

export function attachMcpRoutes(app: Express) {
  app.post('/mcp', session(), async (req: Request, res: Response) => {
    try {
      req.auth = { extra: { user: req.user } };
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', (_: Request, res: Response) => {
    res.header('X-Accel-Buffering', 'no');
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      }),
    );
  });

  app.delete('/mcp', (_: Request, res: Response) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      }),
    );
  });
}
