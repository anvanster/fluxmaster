import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { gitStatusTool } from './git-status.js';
import { gitDiffTool } from './git-diff.js';
import { gitLogTool } from './git-log.js';
import { gitCommitTool } from './git-commit.js';
import { gitBranchTool } from './git-branch.js';

describe('git tools', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-tools-'));
    execSync('git init -b main', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'initial content\n');
    execSync('git add . && git commit -m "initial commit"', { cwd: tmpDir });
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('git_status', () => {
    it('has correct name', () => {
      expect(gitStatusTool.name).toBe('git_status');
    });

    it('shows clean status', async () => {
      const result = await gitStatusTool.execute({ path: tmpDir });
      expect(result.isError).toBeUndefined();
      const status = JSON.parse(result.content);
      expect(status.modified).toHaveLength(0);
      expect(status.staged).toHaveLength(0);
      expect(status.untracked).toHaveLength(0);
    });

    it('detects modified and untracked files', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'changed\n');
      await fs.writeFile(path.join(tmpDir, 'new.txt'), 'new file\n');

      const result = await gitStatusTool.execute({ path: tmpDir });
      const status = JSON.parse(result.content);
      expect(status.modified).toContain('initial.txt');
      expect(status.untracked).toContain('new.txt');

      // restore
      execSync('git checkout -- initial.txt', { cwd: tmpDir });
      await fs.unlink(path.join(tmpDir, 'new.txt'));
    });

    it('returns error for non-repo directory', async () => {
      const nonRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'non-repo-'));
      const result = await gitStatusTool.execute({ path: nonRepo });
      expect(result.isError).toBe(true);
      await fs.rm(nonRepo, { recursive: true, force: true });
    });
  });

  describe('git_diff', () => {
    it('has correct name', () => {
      expect(gitDiffTool.name).toBe('git_diff');
    });

    it('shows diff for modified file', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'modified content\n');
      const result = await gitDiffTool.execute({ path: tmpDir });
      expect(result.isError).toBeUndefined();
      expect(result.content).toContain('modified content');
      // restore
      execSync('git checkout -- initial.txt', { cwd: tmpDir });
    });

    it('shows staged diff', async () => {
      await fs.writeFile(path.join(tmpDir, 'initial.txt'), 'staged change\n');
      execSync('git add initial.txt', { cwd: tmpDir });
      const result = await gitDiffTool.execute({ path: tmpDir, staged: true });
      expect(result.content).toContain('staged change');
      // restore
      execSync('git reset HEAD initial.txt && git checkout -- initial.txt', { cwd: tmpDir });
    });

    it('returns empty for no changes', async () => {
      const result = await gitDiffTool.execute({ path: tmpDir });
      expect(result.content).toBe('(no changes)');
    });
  });

  describe('git_log', () => {
    it('has correct name', () => {
      expect(gitLogTool.name).toBe('git_log');
    });

    it('shows commit history', async () => {
      const result = await gitLogTool.execute({ path: tmpDir });
      expect(result.isError).toBeUndefined();
      expect(result.content).toContain('initial commit');
    });

    it('respects count parameter', async () => {
      // Add a second commit
      await fs.writeFile(path.join(tmpDir, 'second.txt'), 'second\n');
      execSync('git add . && git commit -m "second commit"', { cwd: tmpDir });

      const result = await gitLogTool.execute({ path: tmpDir, count: 1 });
      expect(result.content).toContain('second commit');
      expect(result.content).not.toContain('initial commit');
    });
  });

  describe('git_commit', () => {
    it('has correct name', () => {
      expect(gitCommitTool.name).toBe('git_commit');
    });

    it('stages specific files and commits', async () => {
      await fs.writeFile(path.join(tmpDir, 'commit-test.txt'), 'commit me\n');
      const result = await gitCommitTool.execute({
        path: tmpDir,
        message: 'test commit',
        files: ['commit-test.txt'],
      });
      expect(result.isError).toBeUndefined();
      expect(result.content).toContain('test commit');
    });

    it('stages all files with all flag', async () => {
      await fs.writeFile(path.join(tmpDir, 'all-test.txt'), 'all\n');
      const result = await gitCommitTool.execute({
        path: tmpDir,
        message: 'commit all',
        all: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content).toContain('commit all');
    });

    it('errors when no files specified and all is false', async () => {
      const result = await gitCommitTool.execute({
        path: tmpDir,
        message: 'empty',
      });
      expect(result.isError).toBe(true);
      expect(result.content).toContain('Specify files');
    });
  });

  describe('git_branch', () => {
    it('has correct name', () => {
      expect(gitBranchTool.name).toBe('git_branch');
    });

    it('lists branches', async () => {
      const result = await gitBranchTool.execute({ path: tmpDir, action: 'list' });
      expect(result.isError).toBeUndefined();
      expect(result.content).toContain('main');
    });

    it('creates and switches to new branch', async () => {
      const result = await gitBranchTool.execute({
        path: tmpDir,
        action: 'create',
        name: 'feature-test',
      });
      expect(result.isError).toBeUndefined();

      const listResult = await gitBranchTool.execute({ path: tmpDir, action: 'list' });
      expect(listResult.content).toContain('feature-test');

      // Switch back
      await gitBranchTool.execute({ path: tmpDir, action: 'switch', name: 'main' });
    });

    it('deletes branch', async () => {
      await gitBranchTool.execute({ path: tmpDir, action: 'create', name: 'to-delete' });
      await gitBranchTool.execute({ path: tmpDir, action: 'switch', name: 'main' });
      const result = await gitBranchTool.execute({
        path: tmpDir,
        action: 'delete',
        name: 'to-delete',
      });
      expect(result.isError).toBeUndefined();
    });

    it('errors without name for create', async () => {
      const result = await gitBranchTool.execute({ path: tmpDir, action: 'create' });
      expect(result.isError).toBe(true);
      expect(result.content).toContain('name');
    });
  });
});
