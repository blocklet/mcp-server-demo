import { getRelativeUrl } from '@blocklet/sdk/lib/component';
import session from '@blocklet/sdk/lib/middlewares/session';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Express, Request, Response } from 'express';

export function attachSSEServer(app: Express, mcpServer: McpServer) {
  const transports = new Map<string, SSEServerTransport>();

  app.get('/mcp/sse', session(), async (req: Request, res: Response) => {
    // Set required headers for SSE
    res.header('X-Accel-Buffering', 'no');

    // Create and store transport
    const transport = new SSEServerTransport(getRelativeUrl('/mcp/messages'), res);
    transport.user = req.user;
    transports.set(transport.sessionId, transport);

    // Clean up on connection close
    res.on('close', () => {
      transports.delete(transport.sessionId);
      transport.close();
    });

    try {
      await mcpServer.connect(transport);
    } catch (error) {
      console.error('Error connecting transport:', error);
      transport.close();
      res.end();
    }
  });

  app.post('/mcp/messages', session(), async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      console.error('Message received without sessionId');
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    let transport = transports.get(sessionId);
    if (!transport) {
      // Create and store transport
      transport = new SSEServerTransport(getRelativeUrl('/mcp/messages'), res);
      transports.set(transport.sessionId, transport);
    }

    try {
      // eslint-disable-next-line no-console
      console.info('mcp message', req.body);
      transport.user = req.user; // we always need to update the user here
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
