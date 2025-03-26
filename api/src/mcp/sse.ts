import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import compression from 'compression';
import { Express } from 'express';

export function attachSSEServer(app: Express, mcpServer: McpServer) {
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  app.get('/sse', compression(), async (_, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('X-Accel-Buffering', 'no');

    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    res.on('close', () => {
      delete transports[transport.sessionId];
    });
    await mcpServer.connect(transport);
  });

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });
}
