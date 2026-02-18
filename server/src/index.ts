import 'dotenv/config';
import express from 'express';
import { routes } from './routes';

const app = express();
const BASE_PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

app.use(express.json());

// Dev CORS (so Vite can call the API)
app.use((req, res, next) => {
  const origin = req.headers.origin ?? '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const MAX_PORT_TRIES = 10;

const startServer = (port: number, triesLeft: number) => {
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE' && triesLeft > 0) {
      server.close();
      startServer(port + 1, triesLeft - 1);
      return;
    }
    throw err;
  });
};

startServer(BASE_PORT, MAX_PORT_TRIES);
