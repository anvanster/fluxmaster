import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  title: vi.fn().mockResolvedValue('Test Page'),
  content: vi.fn().mockResolvedValue('<html><body>Hello</body></html>'),
  textContent: vi.fn().mockResolvedValue('Hello'),
  click: vi.fn().mockResolvedValue(undefined),
  fill: vi.fn().mockResolvedValue(undefined),
  screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockContext = {
  newPage: vi.fn().mockResolvedValue(mockPage),
};

const mockBrowser = {
  newContext: vi.fn().mockResolvedValue(mockContext),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          title: vi.fn(),
        }),
      }),
      close: vi.fn(),
    }),
  },
}));

import { chromium } from 'playwright';
import { BrowserManager } from './browser-manager.js';

describe('BrowserManager', () => {
  let manager: BrowserManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new BrowserManager();

    // Reset the mock implementation for each test
    const launchMock = chromium.launch as ReturnType<typeof vi.fn>;
    launchMock.mockResolvedValue(mockBrowser);
    mockBrowser.newContext.mockResolvedValue(mockContext);
    mockContext.newPage.mockResolvedValue(mockPage);
  });

  it('launches browser with config options', async () => {
    await manager.launch({ headless: true, viewport: { width: 1280, height: 720 } });

    expect(chromium.launch).toHaveBeenCalledWith({ headless: true });
    expect(mockBrowser.newContext).toHaveBeenCalledWith({
      viewport: { width: 1280, height: 720 },
    });
    expect(mockContext.newPage).toHaveBeenCalled();
  });

  it('returns the current page after launch', async () => {
    await manager.launch({ headless: true, viewport: { width: 1280, height: 720 } });
    const page = manager.getPage();
    expect(page).toBe(mockPage);
  });

  it('returns null from getPage before launch', () => {
    expect(manager.getPage()).toBeNull();
  });

  it('closes browser and cleans up', async () => {
    await manager.launch({ headless: true, viewport: { width: 1280, height: 720 } });
    await manager.close();

    expect(mockBrowser.close).toHaveBeenCalled();
    expect(manager.getPage()).toBeNull();
  });
});
