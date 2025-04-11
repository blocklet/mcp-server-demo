import type { McpServer } from '@blocklet/mcp/server/mcp.js';
import { SSEServerTransport } from '@blocklet/mcp/server/sse.js';
import { getRelativeUrl } from '@blocklet/sdk/lib/component';
import session from '@blocklet/sdk/lib/middlewares/session';
import { Express, Request, Response } from 'express';

export function attachSSEServer(app: Express, mcpServer: McpServer) {
  const transports = new Map<string, SSEServerTransport>();

  app.get('/mcp/sse', session(), async (req: Request, res: Response) => {
    // Set required headers for SSE
    res.header('X-Accel-Buffering', 'no');

    // Create and store transport
    const transport = new SSEServerTransport(getRelativeUrl('/mcp/messages'), res);
    transport.authContext = { user: req.user };
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

    const transport = transports.get(sessionId);
    if (!transport) {
      // Instead of returning an error, send a special response that triggers reconnection
      res.status(409).json({
        error: 'transport_not_found',
        message: 'Session expired or not found. Please reconnect.',
        action: 'reconnect',
      });
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.info('mcp message', req.body);
      transport.authContext = { user: req.user };
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
