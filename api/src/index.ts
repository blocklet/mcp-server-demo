// eslint-disable-next-line prettier/prettier
import 'express-async-errors';

import fallback from '@blocklet/sdk/lib/middlewares/fallback';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
// eslint-disable-next-line prettier/prettier
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import path from 'path';

import { mcpServer } from './mcp/server';
import { attachSSEServer } from './mcp/sse';
import routes from './routes';

const logger = require('@blocklet/logger');

dotenv.config();

const { name, version } = require('../../package.json');

export const app = express();

app.set('trust proxy', true);

app.use(morgan('combined', { stream: logger.getAccessLogStream() }));

// Configure CORS for SSE
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));

const router = express.Router();
router.use('/api', routes);
app.use(router);

const isProduction = process.env.NODE_ENV === 'production' || process.env.ABT_NODE_SERVICE_ENV === 'production';

if (isProduction) {
  const staticDir = path.resolve(process.env.BLOCKLET_APP_DIR!, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  app.use(fallback('index.html', { root: staticDir }));

  app.use((err: Error, _req: Request, res: Response) => {
    logger.error(err.stack);
    res.status(500).send('Something broke!');
  });
}

const port = parseInt(process.env.BLOCKLET_PORT!, 10);

attachSSEServer(app, mcpServer);

export const server = app.listen(port, (err?: any) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.info(`> ${name} v${version} ready on ${port}`);
});
