// Bootstrap entrypoint.
//
// Builds the Fastify app (`app.ts`), binds the listening socket, and installs
// graceful-shutdown handlers. Full env validation lives in `src/config/`
// (next Phase 0 task); for now we read host/port with safe defaults so the
// skeleton runs standalone.

import { buildApp } from './app.js';

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PORT ?? 3000);

async function start(): Promise<void> {
  const app = await buildApp();

  // Translate POSIX signals into a clean Fastify close so in-flight requests
  // drain and plugins run their onClose hooks (DB pools, etc.).
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, 'shutting down');
      app
        .close()
        .then(() => process.exit(0))
        .catch((err: unknown) => {
          app.log.error({ err }, 'error during shutdown');
          process.exit(1);
        });
    });
  }

  try {
    await app.listen({ host: HOST, port: PORT });
  } catch (err) {
    app.log.error({ err }, 'failed to start server');
    process.exit(1);
  }
}

void start();
