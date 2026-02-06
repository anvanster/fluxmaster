import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBrowserTools } from './browser-tools.js';
import type { BrowserManager } from './browser-manager.js';

describe('createBrowserTools', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue('Example Page'),
    textContent: vi.fn().mockResolvedValue('Hello World'),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-png-data')),
  };

  const mockManager = {
    getPage: vi.fn().mockReturnValue(mockPage),
    launch: vi.fn(),
    close: vi.fn(),
  } as unknown as BrowserManager;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockManager.getPage as ReturnType<typeof vi.fn>).mockReturnValue(mockPage);
  });

  it('returns 5 browser tools', () => {
    const tools = createBrowserTools(mockManager);
    expect(tools).toHaveLength(5);
    const names = tools.map(t => t.name);
    expect(names).toEqual([
      'browser_navigate',
      'browser_get_text',
      'browser_click',
      'browser_fill',
      'browser_screenshot',
    ]);
  });

  it('browser_navigate goes to URL and returns title', async () => {
    const tools = createBrowserTools(mockManager);
    const navigate = tools.find(t => t.name === 'browser_navigate')!;

    const result = await navigate.execute({ url: 'https://example.com' });
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'domcontentloaded' });
    expect(mockPage.title).toHaveBeenCalled();
    expect(result.content).toContain('Example Page');
  });

  it('browser_get_text returns page text', async () => {
    const tools = createBrowserTools(mockManager);
    const getText = tools.find(t => t.name === 'browser_get_text')!;

    const result = await getText.execute({});
    expect(mockPage.textContent).toHaveBeenCalledWith('body');
    expect(result.content).toBe('Hello World');
  });

  it('browser_click clicks an element', async () => {
    const tools = createBrowserTools(mockManager);
    const click = tools.find(t => t.name === 'browser_click')!;

    const result = await click.execute({ selector: '#submit-btn' });
    expect(mockPage.click).toHaveBeenCalledWith('#submit-btn');
    expect(result.content).toContain('Clicked');
  });

  it('browser_fill fills a form field', async () => {
    const tools = createBrowserTools(mockManager);
    const fill = tools.find(t => t.name === 'browser_fill')!;

    const result = await fill.execute({ selector: '#email', value: 'test@example.com' });
    expect(mockPage.fill).toHaveBeenCalledWith('#email', 'test@example.com');
    expect(result.content).toContain('Filled');
  });

  it('browser_screenshot takes a screenshot', async () => {
    const tools = createBrowserTools(mockManager);
    const screenshot = tools.find(t => t.name === 'browser_screenshot')!;

    const result = await screenshot.execute({});
    expect(mockPage.screenshot).toHaveBeenCalledWith({ type: 'png', fullPage: false });
    expect(result.content).toContain('base64');
  });

  it('returns error when browser not launched', async () => {
    (mockManager.getPage as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const tools = createBrowserTools(mockManager);
    const navigate = tools.find(t => t.name === 'browser_navigate')!;

    const result = await navigate.execute({ url: 'https://example.com' });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not launched');
  });
});
