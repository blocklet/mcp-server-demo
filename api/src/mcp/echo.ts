import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';

const server = new McpServer({
  name: 'Echo',
  version: '1.0.0',
});

server.resource('echo', new ResourceTemplate('echo://{message}', { list: undefined }), (uri, { message }) => ({
  contents: [
    {
      uri: uri.href,
      text: `Resource echo: ${message}`,
    },
  ],
}));

server.tool('echo', { message: z.string() }, ({ message }) => ({
  content: [{ type: 'text', text: `Tool echo: ${message}` }],
}));

server.prompt('echo', { message: z.string() }, ({ message }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Please process this message: ${message}`,
      },
    },
  ],
}));

const app = express();

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get('/sse', async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

app.listen(3001, () => {
  // eslint-disable-next-line no-console
  console.info('Server is running on port 3001');
});
