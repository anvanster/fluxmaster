import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { createChildLogger } from '@fluxmaster/core';
import type { TokenResult } from './gh-token-detector.js';

const logger = createChildLogger('claude-token-detector');

export async function detectClaudeToken(): Promise<TokenResult | null> {
  // Priority 1: Check ANTHROPIC_API_KEY env var (explicit user-set key)
  // (Handled by DirectApiProvider, skip here to avoid double-counting)

  // Priority 2: Read credentials file (Linux/CI environments)
  try {
    const token = await readCredentialsFile();
    if (token) {
      logger.info('Detected Claude token from credentials file');
      return { token, source: 'credentials-file' };
    }
  } catch {
    logger.debug('Claude credentials file not found or unreadable');
  }

  // Priority 3: Check if Claude CLI is installed (OAuth via keychain — no extractable token)
  try {
    const installed = await isClaudeCliInstalled();
    if (installed) {
      logger.info('Claude CLI detected (auth via system keychain)');
      return { token: '__claude_cli__', source: 'claude-cli' };
    }
  } catch {
    logger.debug('Claude CLI not available');
  }

  return null;
}

function isClaudeCliInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('claude', ['--version'], { timeout: 5000 }, (error) => {
      resolve(!error);
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
