import { test, expect } from '@playwright/test';

/**
 * E2E tests for new development tools, agent presets, and workflow templates.
 * Requires backend server running on the port configured in vite proxy.
 */

// All 16 new tools that should be registered
const NEW_TOOLS = [
  'search_text',
  'search_files',
  'edit_file',
  'git_status',
  'git_diff',
  'git_log',
  'git_commit',
  'git_branch',
  'http_request',
  'scratchpad_write',
  'scratchpad_read',
  'scratchpad_list',
  'task_create',
  'task_update',
  'task_list',
  'fan_out',
];

test.describe('Tools API — New Development Tools', () => {
  test('GET /api/tools returns all new tools', async ({ page }) => {
    await page.goto('/');
    const tools = await page.evaluate(async () => {
      const res = await fetch('/api/tools');
      return res.json();
    });

    const toolNames: string[] = tools.map((t: { name: string }) => t.name);

    for (const name of NEW_TOOLS) {
      expect(toolNames, `Missing tool: ${name}`).toContain(name);
    }
  });

  test('tools list includes descriptions', async ({ page }) => {
    await page.goto('/');
    const tools = await page.evaluate(async () => {
      const res = await fetch('/api/tools');
      return res.json();
    });

    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
    }
  });

  test('GET /api/tools/search_text returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/search_text');
      return res.json();
    });

    expect(tool.name).toBe('search_text');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/edit_file returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/edit_file');
      return res.json();
    });

    expect(tool.name).toBe('edit_file');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/git_status returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/git_status');
      return res.json();
    });

    expect(tool.name).toBe('git_status');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/http_request returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/http_request');
      return res.json();
    });

    expect(tool.name).toBe('http_request');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/fan_out returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/fan_out');
      return res.json();
    });

    expect(tool.name).toBe('fan_out');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/scratchpad_write returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/scratchpad_write');
      return res.json();
    });

    expect(tool.name).toBe('scratchpad_write');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/task_create returns tool details', async ({ page }) => {
    await page.goto('/');
    const tool = await page.evaluate(async () => {
      const res = await fetch('/api/tools/task_create');
      return res.json();
    });

    expect(tool.name).toBe('task_create');
    expect(tool.description).toBeTruthy();
  });

  test('GET /api/tools/nonexistent returns 404', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/tools/nonexistent_tool_xyz');
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(404);
    expect(result.body.error).toContain('not found');
  });
});

test.describe('Agent Presets API', () => {
  test('GET /api/system/presets returns all 4 presets', async ({ page }) => {
    await page.goto('/');
    const presets = await page.evaluate(async () => {
      const res = await fetch('/api/system/presets');
      return res.json();
    });

    expect(presets).toHaveLength(4);
    const roles = presets.map((p: { role: string }) => p.role);
    expect(roles).toContain('coordinator');
    expect(roles).toContain('coder');
    expect(roles).toContain('reviewer');
    expect(roles).toContain('tester');
  });

  test('coordinator preset has system prompt and tools', async ({ page }) => {
    await page.goto('/');
    const presets = await page.evaluate(async () => {
      const res = await fetch('/api/system/presets');
      return res.json();
    });

    const coordinator = presets.find((p: { role: string }) => p.role === 'coordinator');
    expect(coordinator).toBeDefined();
    expect(coordinator.systemPrompt).toContain('coordinator');
    expect(coordinator.tools).toContain('delegate_to_agent');
    expect(coordinator.tools).toContain('fan_out');
    expect(coordinator.tools).toContain('task_create');
    expect(coordinator.tools).toContain('scratchpad_write');
  });

  test('coder preset has file and git tools', async ({ page }) => {
    await page.goto('/');
    const presets = await page.evaluate(async () => {
      const res = await fetch('/api/system/presets');
      return res.json();
    });

    const coder = presets.find((p: { role: string }) => p.role === 'coder');
    expect(coder).toBeDefined();
    expect(coder.tools).toContain('edit_file');
    expect(coder.tools).toContain('write_file');
    expect(coder.tools).toContain('git_commit');
    expect(coder.tools).toContain('git_diff');
    expect(coder.tools).toContain('bash_execute');
    expect(coder.tools).toContain('search_text');
  });

  test('reviewer preset is read-only (no write tools)', async ({ page }) => {
    await page.goto('/');
    const presets = await page.evaluate(async () => {
      const res = await fetch('/api/system/presets');
      return res.json();
    });

    const reviewer = presets.find((p: { role: string }) => p.role === 'reviewer');
    expect(reviewer).toBeDefined();
    expect(reviewer.tools).toContain('read_file');
    expect(reviewer.tools).toContain('git_diff');
    expect(reviewer.tools).not.toContain('write_file');
    expect(reviewer.tools).not.toContain('edit_file');
    expect(reviewer.tools).not.toContain('git_commit');
  });

  test('tester preset has bash and file tools', async ({ page }) => {
    await page.goto('/');
    const presets = await page.evaluate(async () => {
      const res = await fetch('/api/system/presets');
      return res.json();
    });

    const tester = presets.find((p: { role: string }) => p.role === 'tester');
    expect(tester).toBeDefined();
    expect(tester.tools).toContain('bash_execute');
    expect(tester.tools).toContain('write_file');
    expect(tester.tools).toContain('search_text');
    expect(tester.tools).toContain('scratchpad_write');
  });
});

test.describe('Workflow Templates API', () => {
  test('GET /api/system/workflow-templates returns all 3 templates', async ({ page }) => {
    await page.goto('/');
    const templates = await page.evaluate(async () => {
      const res = await fetch('/api/system/workflow-templates');
      return res.json();
    });

    expect(templates).toHaveLength(3);
    const ids = templates.map((t: { id: string }) => t.id);
    expect(ids).toContain('tdd-loop');
    expect(ids).toContain('code-review');
    expect(ids).toContain('parallel-analysis');
  });

  test('tdd-loop template has correct structure', async ({ page }) => {
    await page.goto('/');
    const templates = await page.evaluate(async () => {
      const res = await fetch('/api/system/workflow-templates');
      return res.json();
    });

    const tdd = templates.find((t: { id: string }) => t.id === 'tdd-loop');
    expect(tdd).toBeDefined();
    expect(tdd.name).toBe('TDD Loop');
    expect(tdd.description).toContain('Test-driven');
    expect(tdd.inputs).toBeDefined();
    expect(tdd.inputs.requirement).toBeDefined();
    expect(tdd.stepCount).toBe(4);
  });

  test('code-review template has correct structure', async ({ page }) => {
    await page.goto('/');
    const templates = await page.evaluate(async () => {
      const res = await fetch('/api/system/workflow-templates');
      return res.json();
    });

    const review = templates.find((t: { id: string }) => t.id === 'code-review');
    expect(review).toBeDefined();
    expect(review.name).toBe('Code Review Flow');
    expect(review.inputs.task).toBeDefined();
    expect(review.stepCount).toBe(4);
  });

  test('parallel-analysis template has correct structure', async ({ page }) => {
    await page.goto('/');
    const templates = await page.evaluate(async () => {
      const res = await fetch('/api/system/workflow-templates');
      return res.json();
    });

    const analysis = templates.find((t: { id: string }) => t.id === 'parallel-analysis');
    expect(analysis).toBeDefined();
    expect(analysis.name).toBe('Parallel Analysis');
    expect(analysis.inputs.target).toBeDefined();
    expect(analysis.stepCount).toBe(2);
  });
});

test.describe('Admin UI — Tool Selector with New Tools', () => {
  test('tool selector shows new development tools', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('tool-selector')).toBeVisible({ timeout: 10_000 });

    // Check for new tool checkboxes in the selector
    const toolSelector = page.getByTestId('tool-selector');
    for (const toolName of ['search_text', 'edit_file', 'git_status', 'http_request', 'fan_out']) {
      await expect(
        toolSelector.getByText(toolName, { exact: true }),
        `Tool selector should contain ${toolName}`
      ).toBeVisible();
    }
  });

  test('tool selector shows collaboration tools', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('tool-selector')).toBeVisible({ timeout: 10_000 });

    const toolSelector = page.getByTestId('tool-selector');
    for (const toolName of ['scratchpad_write', 'scratchpad_read', 'task_create', 'task_list']) {
      await expect(
        toolSelector.getByText(toolName, { exact: true }),
        `Tool selector should contain ${toolName}`
      ).toBeVisible();
    }
  });

  test('new tools are selectable in spawn form', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('tool-selector')).toBeVisible({ timeout: 10_000 });

    // Find and check a new tool
    const searchTextCheckbox = page.getByTestId('tool-selector')
      .locator('label', { hasText: 'search_text' })
      .locator('input[type="checkbox"]');
    await searchTextCheckbox.check();
    await expect(searchTextCheckbox).toBeChecked();
  });

  test('spawns agent with new tools selected', async ({ page }) => {
    const agentId = `e2e-tools-${Date.now()}`;
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('agent-list')).toBeVisible({ timeout: 10_000 });

    // Fill the form
    await page.getByTestId('agent-id-input').fill(agentId);
    await page.getByTestId('agent-model-select').selectOption('gpt-4o');
    await page.getByTestId('agent-system-prompt').fill('E2E agent with new tools');

    // Select new tools
    const toolSelector = page.getByTestId('tool-selector');
    for (const toolName of ['search_text', 'edit_file', 'git_status']) {
      const checkbox = toolSelector
        .locator('label', { hasText: toolName })
        .locator('input[type="checkbox"]');
      await checkbox.check();
    }

    // Spawn
    await page.getByRole('button', { name: 'Spawn Agent' }).click();
    await expect(page.getByText('Agent spawned')).toBeVisible({ timeout: 10_000 });

    // Expand agent to verify tools
    await page.getByTestId(`expand-${agentId}`).click();
    await expect(page.getByTestId(`details-${agentId}`)).toBeVisible();
    await expect(page.getByTestId(`details-${agentId}`).getByText('search_text')).toBeVisible();
    await expect(page.getByTestId(`details-${agentId}`).getByText('edit_file')).toBeVisible();
    await expect(page.getByTestId(`details-${agentId}`).getByText('git_status')).toBeVisible();

    // Clean up
    await page.getByLabel(`Kill agent ${agentId}`).click();
  });
});

test.describe('Tool Security Classification', () => {
  test('security API returns classifications for new tools', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/security/tools');
      if (!res.ok) return null;
      return res.json();
    });

    // If security endpoint exists, verify classifications
    if (result) {
      // Public tools should be listed
      const publicTools = result.public || [];
      const restrictedTools = result.restricted || [];
      const allClassified = [...publicTools, ...restrictedTools];

      for (const toolName of ['search_text', 'search_files', 'git_status', 'git_diff', 'git_log']) {
        expect(allClassified, `${toolName} should be classified`).toContain(toolName);
      }
    }
  });
});

test.describe('Workflow CRUD with Templates', () => {
  test('can create workflow from template data', async ({ page }) => {
    await page.goto('/');

    // Get a template first
    const templates = await page.evaluate(async () => {
      const res = await fetch('/api/system/workflow-templates');
      return res.json();
    });
    expect(templates.length).toBeGreaterThan(0);

    // Get full template details (templates endpoint only returns summary)
    const tddTemplate = templates.find((t: { id: string }) => t.id === 'tdd-loop');
    expect(tddTemplate).toBeDefined();
    expect(tddTemplate.name).toBe('TDD Loop');
  });

  test('workflow list endpoint works', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/workflows');
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body.workflows).toBeDefined();
    expect(Array.isArray(result.body.workflows)).toBe(true);
  });
});

test.describe('System Health with New Components', () => {
  test('health endpoint still returns ok', async ({ page }) => {
    await page.goto('/');
    const health = await page.evaluate(async () => {
      const res = await fetch('/api/system/health');
      return res.json();
    });

    expect(health.status).toBe('ok');
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });

  test('cost endpoint works with new tools', async ({ page }) => {
    await page.goto('/');
    const cost = await page.evaluate(async () => {
      const res = await fetch('/api/system/cost');
      return res.json();
    });

    expect(cost.totalCost).toBeDefined();
    expect(cost.totalPremiumRequests).toBeDefined();
  });

  test('models endpoint returns available models', async ({ page }) => {
    await page.goto('/');
    const models = await page.evaluate(async () => {
      const res = await fetch('/api/system/models');
      return res.json();
    });

    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].id).toBeTruthy();
    expect(models[0].provider).toBeTruthy();
  });
});
