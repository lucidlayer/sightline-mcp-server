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
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const callMemoryTool = (toolName: string, args: any) => {
  return new Promise((resolve, reject) => {
    const cmd = `npx mcp-client call memory ${toolName} '${JSON.stringify(args)}'`;
    exec(cmd, { maxBuffer: 1024 * 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Memory MCP call error:', stderr || error);
        return reject(error);
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (e) {
        console.error('Failed to parse memory MCP response:', stdout);
        reject(e);
      }
    });
  });
};

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
      name: 'get_snapshot_history',
      description: 'Retrieve the full version lineage of a snapshot by traversing hasPreviousVersion relations',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string', description: 'The ID of the snapshot to get history for' }
        },
        required: ['snapshotId']
      },
      outputSchema: {
        type: 'array',
        description: 'Ordered list of snapshot IDs from newest to oldest',
        items: { type: 'string' }
      }
    },
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

      // Create Snapshot entity in memory MCP
      callMemoryTool('create_entities', {
        entities: [
          {
            name: `Snapshot_${snapshotId}`,
            entityType: "DataArtifact",
            observations: [
              `Snapshot ID: ${snapshotId}`,
              `URL: ${url}`,
              `Timestamp: ${new Date().toISOString()}`
            ]
          }
        ]
      }).catch(console.error);

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

      // Strict validation: expectedProperties must be a non-empty object
      if (
        !expectedProperties ||
        typeof expectedProperties !== 'object' ||
        Array.isArray(expectedProperties) ||
        Object.keys(expectedProperties).length === 0
      ) {
        throw new Error('Invalid expectedProperties: must be a non-empty object');
      }

      // If it's a flat selector-text mapping, convert to nested format
      if (
        !('selectors' in expectedProperties) &&
        !('textContent' in expectedProperties) &&
        !('styles' in expectedProperties) &&
        !('attributes' in expectedProperties)
      ) {
        // Check if nested per-selector format (selectors as keys with nested objects)
        const nestedSelectors = Object.entries(expectedProperties).filter(
          ([, val]) => typeof val === 'object' && val !== null && !Array.isArray(val)
        );
        if (nestedSelectors.length > 0) {
          // Convert nested format to normalized format
          const selectorsArr: string[] = [];
          const textContentObj: Record<string, string> = {};
          const stylesObj: Record<string, Record<string, string>> = {};
          const attributesObj: Record<string, Record<string, string | boolean>> = {};
          for (const [selector, rulesUnknown] of nestedSelectors) {
            if (typeof rulesUnknown === 'object' && rulesUnknown !== null) {
              const rules = rulesUnknown as any;
              if ('exists' in rules) {
                if (rules.exists === false) {
                  selectorsArr.push(`!${selector}`);
                } else {
                  selectorsArr.push(selector);
                }
              } else {
                selectorsArr.push(selector);
              }
              if ('text' in rules) {
                textContentObj[selector] = rules.text;
              }
              if ('style' in rules) {
                stylesObj[selector] = rules.style;
              }
              if ('attributes' in rules) {
                attributesObj[selector] = rules.attributes;
              }
            }
          }
          expectedProperties = {};
          if (selectorsArr.length > 0) expectedProperties.selectors = selectorsArr;
          if (Object.keys(textContentObj).length > 0) expectedProperties.textContent = textContentObj;
          if (Object.keys(stylesObj).length > 0) expectedProperties.styles = stylesObj;
          if (Object.keys(attributesObj).length > 0) expectedProperties.attributes = attributesObj;
        } else {
          expectedProperties = { textContent: expectedProperties };
        }
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
          const actualText = el?.textContent || '';
          let match = false;
          if (typeof expectedText === 'string' && expectedText.startsWith('/') && expectedText.endsWith('/')) {
            try {
              const regex = new RegExp(expectedText.slice(1, -1));
              match = regex.test(actualText);
            } catch {
              match = false;
            }
          } else if (typeof expectedText === 'string') {
            match = actualText.includes(expectedText);
          }
          if (match) {
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
            const regexPattern = typeof expectedVal === 'string' && expectedVal.startsWith('/') && expectedVal.endsWith('/')
              ? expectedVal.slice(1, -1)
              : null;
            let match = false;
            const styleRegex = new RegExp(`${selector}[^}]*${prop}\\s*:\\s*([^;]+)`);
            const styleMatch = styles.match(styleRegex);
            const actualVal = styleMatch ? styleMatch[1].trim() : '';
            if (regexPattern) {
              try {
                const regex = new RegExp(regexPattern);
                match = regex.test(actualVal);
              } catch {
                match = false;
              }
            } else if (typeof expectedVal === 'string') {
              match = actualVal.includes(expectedVal);
            }
            if (match) {
              results.push(`Style '${prop}: ${expectedVal}' found for '${selector}'.`);
            } else {
              results.push(`Style '${prop}: ${expectedVal}' NOT found for '${selector}'.`);
              allPassed = false;
            }
          }
        }
      }

      if (expectedProperties.attributes) {
        for (const [selector, attrRules] of Object.entries(expectedProperties.attributes)) {
          const el = doc.querySelector(selector);
          if (!el) {
            results.push(`Element '${selector}' NOT found for attribute check.`);
            allPassed = false;
            continue;
          }
          for (const [attr, expectedVal] of Object.entries(attrRules as any)) {
            const actualVal = el.getAttribute(attr) ?? '';
            let match = false;
            if (typeof expectedVal === 'string' && expectedVal.startsWith('/') && expectedVal.endsWith('/')) {
              try {
                const regex = new RegExp(expectedVal.slice(1, -1));
                match = regex.test(actualVal);
              } catch {
                match = false;
              }
            } else if (typeof expectedVal === 'string') {
              match = actualVal.includes(expectedVal);
            }
            if (match) {
              results.push(`Attribute '${attr}=${expectedVal}' found in '${selector}'.`);
            } else {
              results.push(`Attribute '${attr}=${expectedVal}' NOT found in '${selector}'. Actual: '${actualVal}'.`);
              allPassed = false;
            }
          }
        }
      }

      // --- Begin Visual Diffing ---


      const baselineDir = path.join(process.cwd(), 'baselines');
      const diffDir = path.join(process.cwd(), 'diffs');

      if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });
      if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });

      const baselinePath = path.join(baselineDir, `${snapshotId}.png`);
      const diffPath = path.join(diffDir, `${snapshotId}.png`);

      const newImageBuffer = Buffer.from(snapshotData.screenshot, 'base64');

      let visualPass = true;
      let diffPercentage = 0;
      let diffImageBase64 = '';

      if (!fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, newImageBuffer);
      } else {
        const baselineBuffer = fs.readFileSync(baselinePath);

        const baselinePNG = PNG.sync.read(baselineBuffer);
        const newPNG = PNG.sync.read(newImageBuffer);

        if (baselinePNG.width !== newPNG.width || baselinePNG.height !== newPNG.height) {
          visualPass = false;
          results.push('Screenshot dimensions differ, failing visual validation.');
        } else {
          const { width, height } = baselinePNG;
          const diffPNG = new PNG({ width, height });
          const diffPixels = pixelmatch(
            baselinePNG.data,
            newPNG.data,
            diffPNG.data,
            width,
            height,
            { threshold: 0.1 }
          );
          diffPercentage = diffPixels / (width * height);

          const diffBuffer = PNG.sync.write(diffPNG);
          fs.writeFileSync(diffPath, diffBuffer);
          diffImageBase64 = diffBuffer.toString('base64');

          if (diffPercentage > 0.005) {
            visualPass = false;
            results.push(`Visual difference ${(
              diffPercentage * 100
            ).toFixed(2)}% exceeds threshold, failing visual validation.`);
          } else {
            fs.writeFileSync(baselinePath, newImageBuffer);
          }
        }
      }

      const finalPass = allPassed && visualPass;

      // Create ValidationResult entity in memory MCP
      callMemoryTool('create_entities', {
        entities: [
          {
            name: `ValidationResult_${snapshotId}_${Date.now()}`,
            entityType: "ProcessOutcome",
            observations: [
              `Snapshot ID: ${snapshotId}`,
              `Timestamp: ${new Date().toISOString()}`,
              `Pass: ${finalPass}`,
              `Explanation: ${results.join('; ')}`
            ]
          }
        ]
      }).then(() => {
        // Link Snapshot to ValidationResult
        callMemoryTool('create_relations', {
          relations: [
            {
              from: `Snapshot_${snapshotId}`,
              to: `ValidationResult_${snapshotId}_${Date.now()}`,
              relationType: "producesValidationResult"
            }
          ]
        }).catch(console.error);
      }).catch(console.error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                pass: finalPass,
                explanation: results,
                visualDiff: {
                  diffPercentage,
                  diffImageBase64,
                  diffPath
                }
              },
              null,
              2
            )
          }
        ]
      };
    }
    case 'compare_snapshots': {
      const { snapshotId1, snapshotId2 } = req.params.arguments as any;

      const snapshot1 = await new Promise<any>((resolve, reject) => {
        db.get('SELECT data FROM snapshots WHERE id = ?', snapshotId1, (err, row: { data: string } | undefined) => {
          if (err || !row) return reject(new Error('Snapshot 1 not found'));
          resolve(JSON.parse(row.data));
        });
      });

      const snapshot2 = await new Promise<any>((resolve, reject) => {
        db.get('SELECT data FROM snapshots WHERE id = ?', snapshotId2, (err, row: { data: string } | undefined) => {
          if (err || !row) return reject(new Error('Snapshot 2 not found'));
          resolve(JSON.parse(row.data));
        });
      });

      const { window: window1 } = new JSDOM(snapshot1.dom);
      const { window: window2 } = new JSDOM(snapshot2.dom);
      const doc1 = window1.document;
      const doc2 = window2.document;

      const diff = {
        addedElements: [] as string[],
        removedElements: [] as string[],
        changedText: [] as { selector: string; before: string; after: string }[],
        styleChanges: [] as { selector: string; property: string; before: string; after: string }[],
        visualDiff: {
          diffPercentage: 0,
          diffImageBase64: '',
          diffPath: ''
        }
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

      const baselineDir = path.join(process.cwd(), 'baselines');
      const diffDir = path.join(process.cwd(), 'diffs');

      if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });
      if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });

      const diffPath = path.join(diffDir, `${snapshotId1}_vs_${snapshotId2}.png`);

      const buffer1 = Buffer.from(snapshot1.screenshot, 'base64');
      const buffer2 = Buffer.from(snapshot2.screenshot, 'base64');

      const png1 = PNG.sync.read(buffer1);
      const png2 = PNG.sync.read(buffer2);

      if (png1.width === png2.width && png1.height === png2.height) {
        const { width, height } = png1;
        const diffPNG = new PNG({ width, height });
        const diffPixels = pixelmatch(
          png1.data,
          png2.data,
          diffPNG.data,
          width,
          height,
          { threshold: 0.1 }
        );
        const diffPercentage = diffPixels / (width * height);
        const diffBuffer = PNG.sync.write(diffPNG);
        fs.writeFileSync(diffPath, diffBuffer);
        diff.visualDiff.diffPercentage = diffPercentage;
        diff.visualDiff.diffImageBase64 = diffBuffer.toString('base64');
        diff.visualDiff.diffPath = diffPath;
      } else {
        diff.visualDiff.diffPercentage = 1;
        diff.visualDiff.diffImageBase64 = '';
        diff.visualDiff.diffPath = '';
      }

      // Create Diff entity in memory MCP
      const diffId = `${snapshotId1}_vs_${snapshotId2}_${Date.now()}`;
      callMemoryTool('create_entities', {
        entities: [
          {
            name: `Diff_${diffId}`,
            entityType: "ComparisonResult",
            observations: [
              `Source Snapshot ID: ${snapshotId1}`,
              `Target Snapshot ID: ${snapshotId2}`,
              `Timestamp: ${new Date().toISOString()}`,
              `Added Elements: ${diff.addedElements.join(', ')}`,
              `Removed Elements: ${diff.removedElements.join(', ')}`
            ]
          }
        ]
      }).then(() => {
        callMemoryTool('create_relations', {
          relations: [
            {
              from: `Diff_${diffId}`,
              to: `Snapshot_${snapshotId1}`,
              relationType: "comparesSourceSnapshot"
            },
            {
              from: `Diff_${diffId}`,
              to: `Snapshot_${snapshotId2}`,
              relationType: "comparesTargetSnapshot"
            }
          ]
        }).catch(console.error);
      }).catch(console.error);

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
    case 'get_snapshot_history': {
      const { snapshotId } = args as { snapshotId: string };
      const lineage: string[] = [];
      let currentId = snapshotId;

      while (true) {
        lineage.push(currentId);
        const entityName = `Snapshot_${currentId}`;
        let nodeResult: any;
        try {
          nodeResult = await callMemoryTool('open_nodes', { names: [entityName] });
        } catch (e) {
          console.error('Error calling memory.open_nodes:', e);
          break;
        }
        const entities = nodeResult?.entities || [];
        const entity = entities.find((e: any) => e.name === entityName);
        if (!entity) break;

        const hasPrev = (nodeResult.relations || []).find(
          (rel: any) =>
            rel.from === entityName &&
            rel.relationType === 'hasPreviousVersion'
        );
        if (hasPrev && hasPrev.to.startsWith('Snapshot_')) {
          currentId = hasPrev.to.replace('Snapshot_', '');
        } else {
          break;
        }
      }

      return {
        content: [
          {
            type: 'json',
            json: lineage
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
