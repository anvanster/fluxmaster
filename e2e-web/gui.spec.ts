import { test, expect } from '@playwright/test';

test.describe('Layout & Navigation', () => {
  test('loads the app with sidebar and branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByText('Fluxmaster')).toBeVisible();
  });

  test('sidebar has all nav links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Chat' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
  });

  test('sidebar shows connection status', async ({ page }) => {
    await page.goto('/');
    // Should show Connected or Disconnected
    await expect(page.getByTestId('sidebar').locator('text=Connected').or(
      page.getByTestId('sidebar').locator('text=Disconnected')
    )).toBeVisible();
  });

  test('navigates to Dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('navigates to Admin', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL('/admin');
    await expect(page.getByTestId('admin-view')).toBeVisible();
  });

  test('navigates back to Chat', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Chat' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });

  test('Chat nav link is active on homepage', async ({ page }) => {
    await page.goto('/');
    const chatLink = page.getByRole('link', { name: 'Chat' });
    await expect(chatLink).toHaveClass(/text-white/);
  });
});

test.describe('Chat Page', () => {
  test('shows chat input and send button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeEnabled();
    await expect(page.getByLabel('Send message')).toBeVisible();
  });

  test('shows agent selector with default agent', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('agent-selector')).toBeVisible();
    await expect(page.getByTestId('agent-selector').getByText('default')).toBeVisible();
  });

  test('can type in chat input', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('Hello, Fluxmaster!');
    await expect(input).toHaveValue('Hello, Fluxmaster!');
  });

  test('sends a message and receives a streaming response', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('Reply with exactly: pong');
    await page.getByLabel('Send message').click();

    // User message should appear
    await expect(page.locator('text=Reply with exactly: pong')).toBeVisible();

    // Input should be cleared after send
    await expect(input).toHaveValue('');

    // Wait for assistant response (streaming completes, message appears)
    const messages = page.getByTestId('chat-message');
    await expect(messages).toHaveCount(2, { timeout: 30_000 });
  });

  test('assistant response renders markdown', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('Reply with: **bold text** and `inline code`');
    await page.getByLabel('Send message').click();

    // Wait for response
    await expect(page.getByTestId('chat-message')).toHaveCount(2, { timeout: 30_000 });

    // Assistant message should have markdown-content wrapper
    await expect(page.getByTestId('markdown-content')).toBeVisible();
  });

  test('user message does not render markdown', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('This has **bold** but should be plain');
    await page.getByLabel('Send message').click();

    // User message should appear but without markdown wrapper
    await expect(page.locator('text=This has **bold** but should be plain')).toBeVisible();
  });

  test('clear conversation button appears after sending', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');

    // No clear button initially
    await expect(page.getByLabel('Clear conversation')).not.toBeVisible();

    await input.fill('hello');
    await page.getByLabel('Send message').click();
    await expect(page.getByTestId('chat-message')).toHaveCount(2, { timeout: 30_000 });

    // Clear button should now be visible
    await expect(page.getByLabel('Clear conversation')).toBeVisible();
  });

  test('clear conversation removes messages', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('hello');
    await page.getByLabel('Send message').click();
    await expect(page.getByTestId('chat-message')).toHaveCount(2, { timeout: 30_000 });

    // Clear conversation
    await page.getByLabel('Clear conversation').click();

    // Messages should be gone, empty state shown
    await expect(page.getByTestId('chat-message')).toHaveCount(0);
    await expect(page.getByText('No messages yet')).toBeVisible();
  });

  test('sends message with Enter key', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('hello via enter');
    await input.press('Enter');

    // Message should appear
    await expect(page.locator('text=hello via enter')).toBeVisible();
    await expect(input).toHaveValue('');
  });
});

test.describe('Dashboard Page', () => {
  test('shows dashboard with agent data', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10_000 });
  });

  test('shows system health', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Healthy')).toBeVisible({ timeout: 10_000 });
  });

  test('shows agent status card', async ({ page }) => {
    await page.goto('/dashboard');
    const card = page.getByTestId('agent-status-card');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText('default')).toBeVisible();
    await expect(page.getByText('Model: gpt-4o')).toBeVisible();
  });

  test('shows usage summary', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('usage-summary')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin Page — Config Tab', () => {
  test('shows config JSON by default', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByTestId('config-editor')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('config-display')).toBeVisible();
    // Should contain gpt-4o from our config
    await expect(page.getByTestId('config-display')).toContainText('gpt-4o');
  });

  test('Edit button toggles to textarea', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByTestId('config-editor')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Edit').click();
    await expect(page.getByTestId('config-textarea')).toBeVisible();
    // Cancel goes back to display
    await page.getByText('Cancel').click();
    await expect(page.getByTestId('config-display')).toBeVisible();
  });

  test('config textarea is editable', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByTestId('config-editor')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Edit').click();
    const textarea = page.getByTestId('config-textarea');
    await expect(textarea).toBeVisible();
    const value = await textarea.inputValue();
    expect(value).toContain('gpt-4o');
  });
});

test.describe('Admin Page — Agents Tab', () => {
  test('shows agent list with running agents', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('agent-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('agent-count')).toBeVisible();
    // At least the default agent should be running
    await expect(page.getByTestId('agent-list-item').first()).toBeVisible();
  });

  test('agent list shows kill buttons', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('agent-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/Kill agent/)).toBeVisible();
  });

  test('shows agent spawn form', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('agent-provisioner')).toBeVisible();
    await expect(page.getByText('Spawn Agent')).toBeVisible();
  });

  test('spawn button is disabled when fields are empty', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByRole('button', { name: 'Spawn' })).toBeDisabled();
  });

  test('spawn button enables when both fields filled', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await page.getByTestId('agent-id-input').fill('test-e2e');
    await page.getByTestId('agent-model-input').fill('gpt-4o');
    await expect(page.getByRole('button', { name: 'Spawn' })).toBeEnabled();
  });

  test('spawn button disabled with only one field', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Agents' }).click();
    await page.getByTestId('agent-id-input').fill('test-e2e');
    await expect(page.getByRole('button', { name: 'Spawn' })).toBeDisabled();
  });
});

test.describe('Admin Page — MCP Tab', () => {
  test('shows MCP server list or empty state', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'MCP' }).click();
    // Either shows server cards or "No MCP servers configured"
    await expect(
      page.getByText('No MCP servers configured').or(page.getByTestId('mcp-server-list'))
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin Page — Plugins Tab', () => {
  test('shows plugins list or empty state', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Plugins' }).click();
    await expect(
      page.getByText('No plugins loaded').or(page.getByTestId('plugin-list'))
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin Page — Auth Tab', () => {
  test('shows auth status fields', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Auth' }).click();
    await expect(page.getByTestId('auth-status')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Copilot Configured')).toBeVisible();
    await expect(page.getByText('Copilot Ready')).toBeVisible();
    await expect(page.getByText('Claude CLI')).toBeVisible();
    await expect(page.getByText('Direct Providers')).toBeVisible();
  });
});

test.describe('Chat Persistence', () => {
  test('conversations persist after page reload', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');
    await input.fill('persist me');
    await page.getByLabel('Send message').click();
    await expect(page.getByTestId('chat-message')).toHaveCount(2, { timeout: 30_000 });

    // Reload page
    await page.reload();

    // Messages should still be there
    await expect(page.locator('text=persist me')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('chat-message')).toHaveCount(2);
  });
});

test.describe('Admin Page — Tab Switching', () => {
  test('cycles through all tabs', async ({ page }) => {
    await page.goto('/admin');

    // Config (default)
    await expect(page.getByRole('button', { name: 'Config' })).toBeVisible();

    // Agents
    await page.getByRole('button', { name: 'Agents' }).click();
    await expect(page.getByTestId('agent-provisioner')).toBeVisible();

    // MCP
    await page.getByRole('button', { name: 'MCP' }).click();
    await expect(page.getByTestId('agent-provisioner')).not.toBeVisible();

    // Plugins
    await page.getByRole('button', { name: 'Plugins' }).click();

    // Auth
    await page.getByRole('button', { name: 'Auth' }).click();
    await expect(page.getByTestId('auth-status')).toBeVisible({ timeout: 10_000 });

    // Back to Config
    await page.getByRole('button', { name: 'Config' }).click();
    await expect(page.getByTestId('config-editor')).toBeVisible({ timeout: 10_000 });
  });
});
