export interface ServerConfig {
  port: number;
  host: string;
  configPath: string;
}

export const defaultServerConfig: ServerConfig = {
  port: 3000,
  host: '0.0.0.0',
  configPath: 'fluxmaster.config.json',
};

export function resolveServerConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    ...defaultServerConfig,
    ...overrides,
    port: overrides?.port ?? (Number(process.env.PORT) || defaultServerConfig.port),
    host: overrides?.host ?? (process.env.HOST || defaultServerConfig.host),
  };
}
