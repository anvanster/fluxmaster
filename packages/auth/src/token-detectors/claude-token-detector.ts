import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { createChildLogger } from '@fluxmaster/core';
import type { TokenResult } from './gh-token-detector.js';

const logger = createChildLogger('claude-token-detector');

export async function detectClaudeToken(): Promise<TokenResult | null> {
  // Priority 1: Try claude CLI command
  try {
    const token = await execClaudeAuth();
    if (token) {
      logger.info('Detected Claude token via CLI');
      return { token, source: 'claude-cli' };
    }
  } catch {
    logger.debug('claude CLI not available or not logged in');
  }

  // Priority 2: Read credentials file
  try {
    const token = await readCredentialsFile();
    if (token) {
      logger.info('Detected Claude token from credentials file');
      return { token, source: 'credentials-file' };
    }
  } catch {
    logger.debug('Claude credentials file not found or unreadable');
  }

  return null;
}

function execClaudeAuth(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    execFile('claude', ['auth', 'status', '--json'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        const data = JSON.parse(stdout.trim());
        resolve(data.apiKey || null);
      } catch {
        resolve(null);
      }
    });
  });
}

async function readCredentialsFile(): Promise<string | null> {
  const credPath = path.join(homedir(), '.claude', '.credentials.json');
  const content = await readFile(credPath, 'utf-8');
  const data = JSON.parse(content);

  const oauth = data?.claudeAiOauth;
  if (!oauth?.accessToken) {
    return null;
  }

  // Check expiry if present
  if (oauth.expiresAt) {
    const expiresAt = new Date(oauth.expiresAt);
    if (expiresAt.getTime() <= Date.now()) {
      logger.debug('Claude credentials token is expired');
      return null;
    }
  }

  return oauth.accessToken;
}
