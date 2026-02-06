import { bootstrap, shutdown } from './bootstrap.js';
import { createApp } from './app.js';
import { resolveServerConfig } from './config.js';

async function main(): Promise<void> {
  const serverConfig = resolveServerConfig();
  const ctx = await bootstrap({ configPath: serverConfig.configPath });

  const { app, wsHandler } = await createApp({ ctx });

  const address = await app.listen({ port: serverConfig.port, host: serverConfig.host });
  console.log(`Fluxmaster server listening on ${address}`);

  const gracefulShutdown = async () => {
    wsHandler.shutdown();
    await app.close();
    await shutdown(ctx);
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { createApp } from './app.js';
export { bootstrap, shutdown } from './bootstrap.js';
export { resolveServerConfig } from './config.js';
export type { AppContext } from './context.js';
export type { ServerConfig } from './config.js';
export { UsageTracker } from './usage-tracker.js';
export type * from './shared/index.js';
