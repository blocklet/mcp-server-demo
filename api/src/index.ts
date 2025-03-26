import fallback from '@blocklet/sdk/lib/middlewares/fallback';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { Request, Response } from 'express';
import 'express-async-errors';
import morgan from 'morgan';
import path from 'path';

import { mcpServer } from './mcp/server';
import { attachSSEServer } from './mcp/sse';
import routes from './routes';

const logger = require('@blocklet/logger');
const { name, version } = require('../../package.json');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || process.env.ABT_NODE_SERVICE_ENV === 'production';

export const app = express();

app.set('trust proxy', true);

// Configure CORS for SSE - must be before other middleware
app.use(
  cors({
    origin: '*', // Or configure specific origins
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }),
);

app.use(cookieParser());
app.use(morgan('combined', { stream: logger.getAccessLogStream() }));

// NOTE: This must before body parser such as express.json() and express.urlencoded()
attachSSEServer(app, mcpServer);

const router = express.Router();
// NOTE: these body parser must not be used before attachSSEServer
router.use(express.json({ limit: '1 mb' }));
router.use(express.urlencoded({ extended: true, limit: '1 mb' }));
router.use('/api', routes);

app.use(router);

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

export const server = app.listen(port, (err?: any) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.info(`> ${name} v${version} ready on ${port}`);
});
