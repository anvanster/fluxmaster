import { execFile } from 'node:child_process';
import { createChildLogger } from '@fluxmaster/core';

const logger = createChildLogger('gh-token-detector');

export interface TokenResult {
  token: string;
  source: string;
}

export async function detectGhToken(): Promise<TokenResult | null> {
  // Priority 1: Environment variables
  if (process.env.GH_TOKEN) {
    logger.debug('Using GH_TOKEN env var');
    return { token: process.env.GH_TOKEN, source: 'env-var' };
  }
  if (process.env.GITHUB_TOKEN) {
    logger.debug('Using GITHUB_TOKEN env var');
    return { token: process.env.GITHUB_TOKEN, source: 'env-var' };
  }

  // Priority 2: gh auth token command
  try {
    const token = await execGhAuthToken();
    if (token) {
      logger.info('Detected GitHub token via gh CLI');
      return { token, source: 'gh-cli' };
    }
  } catch {
    logger.debug('gh auth token failed or gh not installed');
  }

  return null;
}

function execGhAuthToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    execFile('gh', ['auth', 'token'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const token = stdout.trim();
      resolve(token || null);
    });
  });
}
