import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import compression from 'compression';
import { Express } from 'express';

export function attachSSEServer(app: Express, mcpServer: McpServer) {
  const transportMap = new Map<string, SSEServerTransport>();

  app.get('/sse', compression(), async (_, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('X-Accel-Buffering', 'no');

    const transport = new SSEServerTransport('/messages', res);
    transportMap.set(transport.sessionId, transport);
    await mcpServer.connect(transport);
  });

  app.post('/messages', (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      console.error('Message received without sessionId');
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const transport = transportMap.get(sessionId);

    if (transport) {
      transport.handlePostMessage(req, res);
    }
  });
}
