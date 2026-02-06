import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { BrowserConfig } from '@fluxmaster/core';
import { createChildLogger } from '@fluxmaster/core';

const logger = createChildLogger('browser-manager');

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async launch(config: BrowserConfig): Promise<void> {
    this.browser = await chromium.launch({
      headless: config.headless,
    });

    this.context = await this.browser.newContext({
      viewport: config.viewport,
    });

    this.page = await this.context.newPage();
    logger.info({ headless: config.headless }, 'Browser launched');
  }

  getPage(): Page | null {
    return this.page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      logger.info('Browser closed');
    }
  }
}
