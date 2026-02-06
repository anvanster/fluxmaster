import { z } from 'zod';
import type { Tool, ToolResult } from '@fluxmaster/core';
import type { Page } from 'playwright';
import type { BrowserManager } from './browser-manager.js';

const NOT_LAUNCHED_ERROR: ToolResult = {
  content: 'Browser not launched. Call browser_navigate first or configure browser in config.',
  isError: true,
};

function getPage(manager: BrowserManager): Page | null {
  return manager.getPage();
}

export function createBrowserTools(manager: BrowserManager): Tool[] {
  const navigateTool: Tool = {
    name: 'browser_navigate',
    description: 'Navigate the browser to a URL and return the page title.',
    inputSchema: z.object({
      url: z.string().url().describe('The URL to navigate to'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { url } = z.object({ url: z.string().url() }).parse(args);
      const page = getPage(manager);
      if (!page) return NOT_LAUNCHED_ERROR;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const title = await page.title();
      return { content: `Navigated to "${title}" (${url})` };
    },
  };

  const getTextTool: Tool = {
    name: 'browser_get_text',
    description: 'Get the text content of the current page.',
    inputSchema: z.object({}),
    async execute(): Promise<ToolResult> {
      const page = getPage(manager);
      if (!page) return NOT_LAUNCHED_ERROR;

      const text = await page.textContent('body');
      return { content: text ?? '' };
    },
  };

  const clickTool: Tool = {
    name: 'browser_click',
    description: 'Click an element on the page by CSS selector.',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector for the element to click'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { selector } = z.object({ selector: z.string() }).parse(args);
      const page = getPage(manager);
      if (!page) return NOT_LAUNCHED_ERROR;

      await page.click(selector);
      return { content: `Clicked "${selector}"` };
    },
  };

  const fillTool: Tool = {
    name: 'browser_fill',
    description: 'Fill a form field by CSS selector.',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector for the input element'),
      value: z.string().describe('The value to fill in'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { selector, value } = z.object({ selector: z.string(), value: z.string() }).parse(args);
      const page = getPage(manager);
      if (!page) return NOT_LAUNCHED_ERROR;

      await page.fill(selector, value);
      return { content: `Filled "${selector}" with value` };
    },
  };

  const screenshotTool: Tool = {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page. Returns base64 PNG.',
    inputSchema: z.object({
      fullPage: z.boolean().default(false).describe('Whether to capture the full scrollable page'),
    }),
    async execute(args: unknown): Promise<ToolResult> {
      const { fullPage } = z.object({ fullPage: z.boolean().default(false) }).parse(args);
      const page = getPage(manager);
      if (!page) return NOT_LAUNCHED_ERROR;

      const buffer = await page.screenshot({ type: 'png', fullPage });
      const base64 = buffer.toString('base64');
      return { content: `data:image/png;base64,${base64}` };
    },
  };

  return [navigateTool, getTextTool, clickTool, fillTool, screenshotTool];
}
