import { spawn, type ChildProcess } from 'node:child_process';
import type { IAuthProvider, ModelEndpoint, CopilotConfig } from '@fluxmaster/core';
import { AuthError, createChildLogger } from '@fluxmaster/core';
import { isCopilotModel } from '../models/registry.js';

const logger = createChildLogger('copilot-provider');

export class CopilotAuthProvider implements IAuthProvider {
  readonly name = 'copilot';
  private config: CopilotConfig & { accountType: string; port: number };
  private process?: ChildProcess;
  private ready = false;

  constructor(config: CopilotConfig) {
    this.config = {
      ...config,
      accountType: config.accountType ?? 'enterprise',
      port: config.port ?? 4141,
    };
  }

  async initialize(): Promise<void> {
    if (await this.checkHealth()) {
      logger.info('Copilot API proxy already running');
      this.ready = true;
      return;
    }

    await this.startProxy();
  }

  private async startProxy(): Promise<void> {
    const args = [
      'copilot-api@latest',
      'start',
      '--account-type', this.config.accountType,
      '--port', String(this.config.port),
    ];

    if (this.config.rateLimit) {
      args.push('--rate-limit', String(this.config.rateLimit));
      args.push('--wait');
    }

    const env: Record<string, string> = { ...process.env as Record<string, string> };
    if (this.config.githubToken) {
      env.GH_TOKEN = this.config.githubToken;
    }

    logger.info({ port: this.config.port }, 'Starting Copilot API proxy');

    this.process = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      detached: false,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) logger.debug({ source: 'copilot-api' }, msg);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) logger.warn({ source: 'copilot-api' }, msg);
    });

    this.process.on('exit', (code) => {
      this.ready = false;
      if (code !== 0 && code !== null) {
        logger.error({ code }, 'Copilot API proxy exited unexpectedly');
      }
    });

    await this.waitForReady(this.config.maxStartAttempts ?? 30);
    this.ready = true;
  }

  private async waitForReady(maxAttempts: number): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.checkHealth()) {
        logger.info('Copilot API proxy is ready');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new AuthError(
      `Copilot API proxy failed to start within ${maxAttempts} seconds`,
      'copilot',
    );
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `http://localhost:${this.config.port}/health`,
        { signal: AbortSignal.timeout(2000) },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async getEndpoint(): Promise<ModelEndpoint> {
    if (!this.ready) {
      throw new AuthError('Copilot API proxy not ready', 'copilot');
    }
    return {
      model: '', // Caller sets the model
      baseUrl: `http://localhost:${this.config.port}`,
      apiKey: 'dummy',
      provider: 'copilot',
    };
  }

  isModelAvailable(model: string): boolean {
    return isCopilotModel(model);
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = undefined;
      logger.info('Copilot API proxy stopped');
    }
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }
}
