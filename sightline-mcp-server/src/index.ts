#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { JSDOM } from 'jsdom';

const db = new sqlite3.Database('sightline.db');
db.run(`CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  data TEXT
)`);

const server = new Server(
  {
    name: 'sightline-mcp-server',
    version: '0.1.0'
  },
  {
    capabilities: {
      resources: {},
      tools: {}
    }
  }
);

// Register tool list
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'take_snapshot',
      description: 'Capture screenshot, DOM, styles, and layout of a webpage',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target webpage URL' },
          viewport: {
            type: 'object',
            description: 'Optional viewport size',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' }
            },
            required: []
          },
          delay: { type: 'number', description: 'Optional delay before capture in ms' },
          fullPage: { type: 'boolean', description: 'Capture full page screenshot' }
        },
        required: ['url']
      },
      outputSchema: {
        type: 'object',
        properties: {
          screenshot: { type: 'string', description: 'Base64-encoded screenshot image' },
          dom: { type: 'string', description: 'HTML content of the page' },
          styles: { type: 'string', description: 'Serialized CSS styles' },
          boundingBoxes: {
            type: 'array',
            description: 'Bounding boxes of key elements',
            items: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
              },
              required: ['selector', 'x', 'y', 'width', 'height']
            }
          },
          textContent: { type: 'string', description: 'Visible text content' }
        },
        required: ['screenshot', 'dom']
      }
    },
    {
      name: 'validate_fix',
      description: 'Validate if a UI fix was successful based on snapshot data',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string' },
          expectedProperties: { type: 'object' }
        },
        required: ['snapshotId', 'expectedProperties']
      }
    },
    {
      name: 'get_dom_structure',
      description: 'Return the DOM structure of a webpage',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' }
        },
        required: ['url']
      }
    },
    {
      name: 'compare_snapshots',
      description: 'Compare two snapshots and highlight differences',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId1: { type: 'string' },
          snapshotId2: { type: 'string' }
        },
        required: ['snapshotId1', 'snapshotId2']
      }
    },
    {
      name: 'highlight_element',
      description: 'Highlight a DOM element in the browser for debugging',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          selector: { type: 'string' }
        },
        required: ['url', 'selector']
      }
    }
  ]
}));

// Register placeholder tool handlers
// eslint-disable-next-line @typescript-eslint/no-var-requires
import puppeteer from 'puppeteer';

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  switch (name) {
    case 'take_snapshot': {
      const { url, viewport, delay, fullPage } = args as any;
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      if (viewport && viewport.width && viewport.height) {
        await page.setViewport({ width: viewport.width, height: viewport.height });
      }
      await page.goto(url, { waitUntil: 'networkidle2' });
      if (delay) await new Promise(res => setTimeout(res, delay));

      const screenshotBuffer = await page.screenshot({ fullPage: !!fullPage, encoding: 'base64' });
      const dom = await page.content();

      const styles = await page.evaluate(() => {
        let css = '';
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules)) {
              css += rule.cssText + '\\n';
            }
          } catch (e) {
            // ignore CORS errors
          }
        }
        return css;
      });

      const boundingBoxes = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('body *'));
        return elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            selector: el.tagName.toLowerCase(),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          };
        });
      });

      const textContent = await page.evaluate(() => document.body.innerText);

      await browser.close();

      const snapshotData = {
        screenshot: screenshotBuffer,
        dom,
        styles,
        boundingBoxes,
        textContent
      };

      const snapshotId = uuidv4();

      db.run('INSERT INTO snapshots (id, data) VALUES (?, ?)', snapshotId, JSON.stringify(snapshotData));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ snapshotId })
          }
        ]
      };
    }
    case 'validate_fix': {
      const { snapshotId } = req.params.arguments as any;
      let { expectedProperties } = req.params.arguments as any;

      // Fix: if expectedProperties is a flat selector-text mapping, convert to nested format
      if (
        expectedProperties &&
        typeof expectedProperties === 'object' &&
        !Array.isArray(expectedProperties) &&
        !('selectors' in expectedProperties) &&
        !('textContent' in expectedProperties) &&
        !('styles' in expectedProperties)
      ) {
        expectedProperties = { textContent: expectedProperties };
      }

      const snapshotData = await new Promise<any>((resolve, reject) => {
        db.get('SELECT data FROM snapshots WHERE id = ?', snapshotId, (err, row: { data?: string } | undefined) => {
          if (err || !row || !row.data) return reject(new Error('Snapshot not found'));
          resolve(JSON.parse(row.data));
        });
      });

      const { dom, styles } = snapshotData;

      const { window } = new JSDOM(dom);
      const doc = window.document;

      const results: string[] = [];
      let allPassed = true;

      if (expectedProperties.selectors) {
        for (const selector of expectedProperties.selectors) {
          const found = doc.querySelector(selector);
          if (found) {
            results.push(`Selector '${selector}' found.`);
          } else {
            results.push(`Selector '${selector}' NOT found.`);
            allPassed = false;
          }
        }
      }

      if (expectedProperties.textContent) {
        for (const [selector, expectedText] of Object.entries(expectedProperties.textContent)) {
          const el = doc.querySelector(selector);
          if (el && el.textContent?.includes(expectedText as string)) {
            results.push(`Text '${expectedText}' found in '${selector}'.`);
          } else {
            results.push(`Text '${expectedText}' NOT found in '${selector}'.`);
            allPassed = false;
          }
        }
      }

      if (expectedProperties.styles) {
        for (const [selector, styleRules] of Object.entries(expectedProperties.styles)) {
          for (const [prop, expectedVal] of Object.entries(styleRules as any)) {
            const regex = new RegExp(`${selector}[^}]*${prop}\\s*:\\s*${expectedVal}`);
            if (regex.test(styles)) {
              results.push(`Style '${prop}: ${expectedVal}' found for '${selector}'.`);
            } else {
              results.push(`Style '${prop}: ${expectedVal}' NOT found for '${selector}'.`);
              allPassed = false;
            }
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                pass: allPassed,
                explanation: results
              },
              null,
              2
            )
          }
        ]
      };
    }
    case 'compare_snapshots': {
      const { snapshot1, snapshot2 } = req.params.arguments as any;

      const parser = new DOMParser();
      const doc1 = parser.parseFromString(snapshot1.dom, 'text/html');
      const doc2 = parser.parseFromString(snapshot2.dom, 'text/html');

      const diff = {
        addedElements: [] as string[],
        removedElements: [] as string[],
        changedText: [] as { selector: string; before: string; after: string }[],
        styleChanges: [] as { selector: string; property: string; before: string; after: string }[]
      };

      const allSelectors1 = new Set(Array.from(doc1.querySelectorAll('*')).map(e => e.tagName.toLowerCase()));
      const allSelectors2 = new Set(Array.from(doc2.querySelectorAll('*')).map(e => e.tagName.toLowerCase()));

      for (const sel of allSelectors2) {
        if (!allSelectors1.has(sel)) diff.addedElements.push(sel);
      }
      for (const sel of allSelectors1) {
        if (!allSelectors2.has(sel)) diff.removedElements.push(sel);
      }

      const textMap1 = new Map<string, string>();
      doc1.querySelectorAll('*').forEach(e => textMap1.set(e.tagName.toLowerCase(), e.textContent || ''));
      doc2.querySelectorAll('*').forEach(e => {
        const before = textMap1.get(e.tagName.toLowerCase()) || '';
        const after = e.textContent || '';
        if (before !== after) {
          diff.changedText.push({
            selector: e.tagName.toLowerCase(),
            before,
            after
          });
        }
      });

      const styleLines1 = snapshot1.styles.split('\\n');
      const styleLines2 = snapshot2.styles.split('\\n');
      for (const line2 of styleLines2) {
        const match2 = line2.match(/^([^\\{]+)\\{([^\\}]+)\\}/);
        if (!match2) continue;
        const selector = match2[1].trim();
        const props2 = match2[2].trim();

        const line1 = styleLines1.find((l: string) => l.startsWith(selector));
        if (!line1) {
          diff.styleChanges.push({ selector, property: '*', before: '', after: props2 });
          continue;
        }
        const match1 = line1.match(/^([^\\{]+)\\{([^\\}]+)\\}/);
        if (!match1) continue;
        const props1 = match1[2].trim();

        const props1Map = Object.fromEntries(
          props1
            .split(';')
            .map((p: string) => p.split(':').map((s: string) => s.trim()) as [string, string])
            .filter((p: [string, string]) => p.length === 2)
        );
        const props2Map = Object.fromEntries(
          props2
            .split(';')
            .map((p: string) => p.split(':').map((s: string) => s.trim()) as [string, string])
            .filter((p: [string, string]) => p.length === 2)
        );

        for (const prop in props2Map) {
          if (!(prop in props1Map)) {
            diff.styleChanges.push({ selector, property: prop, before: '', after: props2Map[prop] });
          } else if (props1Map[prop] !== props2Map[prop]) {
            diff.styleChanges.push({ selector, property: prop, before: props1Map[prop], after: props2Map[prop] });
          }
        }
        for (const prop in props1Map) {
          if (!(prop in props2Map)) {
            diff.styleChanges.push({ selector, property: prop, before: props1Map[prop], after: '' });
          }
        }
      }

      return {
        content: [
          {
            type: 'json',
            json: diff
          }
        ]
      };
    }
    case 'get_dom_structure':
    case 'highlight_element': {
      const { url, selector } = req.params.arguments as any;
      const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });

      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.style.outline = '4px solid red';
          el.style.transition = 'outline 0.3s ease';
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, selector);

      const screenshot = await page.screenshot({ encoding: 'base64' });

      await browser.close();

      return {
        content: [
          {
            type: 'json',
            json: {
              message: `Element '${selector}' highlighted.`,
              screenshot
            }
          }
        ]
      };
    }
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sightline MCP server running');
}

main().catch((err) => {
  console.error('Sightline MCP server error:', err);
  process.exit(1);
});
