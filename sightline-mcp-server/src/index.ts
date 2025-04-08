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
import { GraphStore } from './graph/graphStore.js';

type MCPArgs = Record<string, unknown>;


const db = new sqlite3.Database('sightline.db');
db.run(`CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  data TEXT
)`);

const graphStore = new GraphStore(db);

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
      name: 'create_entities',
      description: 'Create entities in the internal knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                entityType: { type: 'string' },
                observations: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['name', 'entityType', 'observations']
            }
          }
        },
        required: ['entities']
      }
    },
    {
      name: 'create_relations',
      description: 'Create relations in the internal knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          relations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                relationType: { type: 'string' }
              },
              required: ['from', 'to', 'relationType']
            }
          }
        },
        required: ['relations']
      }
    },
    {
      name: 'add_observations',
      description: 'Add observations to existing entities',
      inputSchema: {
        type: 'object',
        properties: {
          observations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityName: { type: 'string' },
                contents: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['entityName', 'contents']
            }
          }
        },
        required: ['observations']
      }
    },
    {
      name: 'search_nodes',
      description: 'Search entities in the internal knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    },
    {
      name: 'open_nodes',
      description: 'Open entities by name in the internal knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          names: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['names']
      }
    },
    {
      name: 'sequentialthinking',
      description: 'Perform or update a step in a sequential reasoning chain',
      inputSchema: {
        type: 'object',
        properties: {
          thought: { type: 'string' },
          nextThoughtNeeded: { type: 'boolean' },
          thoughtNumber: { type: 'integer' },
          totalThoughts: { type: 'integer' },
          isRevision: { type: 'boolean', default: false },
          revisesThought: { type: 'integer' },
          branchFromThought: { type: 'integer' },
          branchId: { type: 'string' },
          needsMoreThoughts: { type: 'boolean' }
        },
        required: ['thought', 'nextThoughtNeeded', 'thoughtNumber', 'totalThoughts']
      }
    },
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
      name: 'get_validation_results',
      description: 'Retrieve all validation results and their metadata for a given snapshot',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string', description: 'The ID of the snapshot to get validation results for' }
        },
        required: ['snapshotId']
      },
      outputSchema: {
        type: 'array',
        description: 'List of validation results with metadata',
        items: {
          type: 'object',
          properties: {
            validationName: { type: 'string' },
            pass: { type: 'boolean' },
            timestamp: { type: 'string' },
            explanation: { type: 'string' }
          },
          required: ['validationName', 'pass', 'timestamp', 'explanation']
        }
      }
    },
    {
      name: 'get_snapshot_diffs',
      description: 'Retrieve all diffs related to a snapshot, including metadata',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string', description: 'The ID of the snapshot to get diffs for' }
        },
        required: ['snapshotId']
      },
      outputSchema: {
        type: 'array',
        description: 'List of diffs with metadata',
        items: {
          type: 'object',
          properties: {
            diffName: { type: 'string' },
            timestamp: { type: 'string' },
            summary: { type: 'string' },
            sourceSnapshotId: { type: 'string' },
            targetSnapshotId: { type: 'string' }
          },
          required: ['diffName', 'timestamp', 'summary', 'sourceSnapshotId', 'targetSnapshotId']
        }
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

  if (name === 'create_entities') {
    graphStore.createEntities((args as { entities: any[] }).entities);
    return { content: [{ type: 'text', text: 'Entities created' }] };
  }
  if (name === 'create_relations') {
    graphStore.createRelations((args as { relations: any[] }).relations);
    return { content: [{ type: 'text', text: 'Relations created' }] };
  }
  if (name === 'add_observations') {
    graphStore.addObservations((args as { observations: any[] }).observations);
    return { content: [{ type: 'text', text: 'Observations added' }] };
  }
  if (name === 'search_nodes') {
    return new Promise((resolve) => {
      graphStore.searchNodes((args as { query: string }).query, (results) => {
        resolve({ content: [{ type: 'json', json: results }] });
      });
    });
  }
  if (name === 'open_nodes') {
    return new Promise((resolve) => {
      graphStore.openNodes((args as { names: string[] }).names, (results) => {
        resolve({ content: [{ type: 'json', json: results }] });
      });
    });
  }
  if (name === 'sequentialthinking') {
    const {
      thought,
      nextThoughtNeeded,
      thoughtNumber,
      totalThoughts,
      isRevision = false,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts
    } = args as any;

    const entityName = `SeqThought_${branchId || 'main'}_${thoughtNumber}`;
    const obs = [
      `Thought: ${thought}`,
      `NextThoughtNeeded: ${nextThoughtNeeded}`,
      `ThoughtNumber: ${thoughtNumber}`,
      `TotalThoughts: ${totalThoughts}`,
      `IsRevision: ${isRevision}`,
      `RevisesThought: ${revisesThought}`,
      `BranchFromThought: ${branchFromThought}`,
      `BranchId: ${branchId}`,
      `NeedsMoreThoughts: ${needsMoreThoughts}`
    ];

    graphStore.createEntities([
      {
        name: entityName,
        entityType: 'SequentialThought',
        observations: obs
      }
    ]);

    return {
      content: [
        {
          type: 'json',
          json: {
            thoughtNumber,
            totalThoughts,
            nextThoughtNeeded,
            branches: [],
            thoughtHistoryLength: thoughtNumber // Simplified
          }
        }
      ]
    };
  }

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

      const snapshotDir = path.join(process.cwd(), 'snapshots-repo');
      const timestamp = new Date().toISOString();

      try {
        fs.writeFileSync(path.join(snapshotDir, `${snapshotId}.html`), dom);
        fs.writeFileSync(path.join(snapshotDir, `${snapshotId}.css`), styles);
        fs.writeFileSync(path.join(snapshotDir, `${snapshotId}.txt`), textContent);
        fs.writeFileSync(path.join(snapshotDir, `${snapshotId}.json`), JSON.stringify({ url, timestamp, boundingBoxes }, null, 2));
        fs.writeFileSync(path.join(snapshotDir, `${snapshotId}.png`), Buffer.from(screenshotBuffer, 'base64'));

        exec(`git add .`, { cwd: snapshotDir }, (err) => {
          if (err) console.error('Git add error:', err);
          else {
            exec(`git commit -m "Snapshot of ${url} at ${timestamp}"`, { cwd: snapshotDir }, (err2, stdout, stderr) => {
              if (err2) console.error('Git commit error:', stderr || err2);
              else {
                const match = stdout.match(/\\b([a-f0-9]{40})\\b/);
                const commitHash = match ? match[1] : '';
                if (commitHash) {
                  graphStore.addObservations([
                    {
                      entityName: `Snapshot_${snapshotId}`,
                      contents: [`Git commit hash: ${commitHash}`]
                    }
                  ]);
                }
              }
            });
          }
        });
      } catch (e) {
        console.error('Snapshot file/Git error:', e);
      }

      // Create Snapshot entity in internal graph
      graphStore.createEntities([
        {
          name: `Snapshot_${snapshotId}`,
          entityType: "DataArtifact",
          observations: [
            `Snapshot ID: ${snapshotId}`,
            `URL: ${url}`,
            `Timestamp: ${timestamp}`
          ]
        }
      ]);

      graphStore.searchNodes(url, (latestSnapshots) => {
        latestSnapshots = latestSnapshots.filter((e: any) =>
          e.name.startsWith('Snapshot_') && e.name !== `Snapshot_${snapshotId}`
        );
        let latestSnapshotName = '';
        let latestSnapshotTime = '';
        for (const snap of latestSnapshots) {
          const timeObs = snap.observations?.find((o: string) => o.startsWith('Timestamp:')) || '';
          if (timeObs) {
            const time = timeObs.split('Timestamp:')[1].trim();
            if (!latestSnapshotTime || time > latestSnapshotTime) {
              latestSnapshotTime = time;
              latestSnapshotName = snap.name;
            }
          }
        }
        if (latestSnapshotName) {
          graphStore.createRelations([
            {
              from: `Snapshot_${snapshotId}`,
              to: latestSnapshotName,
              relationType: 'hasPreviousVersion'
            }
          ]);
        }
      });

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

      const validationId = uuidv4();
      const validationDir = path.join(process.cwd(), 'diffs');
      const timestamp = new Date().toISOString();

      try {
        if (diffImageBase64) {
          fs.writeFileSync(path.join(validationDir, `${validationId}.png`), Buffer.from(diffImageBase64, 'base64'));
        }
        fs.writeFileSync(path.join(validationDir, `${validationId}.json`), JSON.stringify({
          snapshotId,
          timestamp,
          pass: finalPass,
          explanation: results,
          diffPercentage,
          diffPath
        }, null, 2));
      } catch (e) {
        console.error('Error saving validation diff:', e);
      }

      const validationEntityName = `ValidationResult_${validationId}`;
      graphStore.createEntities([
        {
          name: validationEntityName,
          entityType: "ProcessOutcome",
          observations: [
            `Validation ID: ${validationId}`,
            `Snapshot ID: ${snapshotId}`,
            `Timestamp: ${timestamp}`,
            `Pass: ${finalPass}`,
            `Explanation: ${results.join('; ')}`,
            `Diff Image Path: ${path.join(validationDir, `${validationId}.png`)}`
          ]
        }
      ]);
      graphStore.createRelations([
        {
          from: `Snapshot_${snapshotId}`,
          to: validationEntityName,
          relationType: "producesValidationResult"
        }
      ]);

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

      const diffId = uuidv4();
      const diffPath = path.join(diffDir, `${diffId}.png`);

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

      try {
        fs.writeFileSync(path.join(diffDir, `${diffId}.json`), JSON.stringify({
          snapshotId1,
          snapshotId2,
          timestamp: new Date().toISOString(),
          diffPercentage: diff.visualDiff.diffPercentage,
          addedElements: diff.addedElements,
          removedElements: diff.removedElements,
          changedText: diff.changedText,
          styleChanges: diff.styleChanges,
          diffPath
        }, null, 2));
      } catch (e) {
        console.error('Error saving diff metadata:', e);
      }

      graphStore.createEntities([
        {
          name: `Diff_${diffId}`,
          entityType: "ComparisonResult",
          observations: [
            `Diff ID: ${diffId}`,
            `Source Snapshot ID: ${snapshotId1}`,
            `Target Snapshot ID: ${snapshotId2}`,
            `Timestamp: ${new Date().toISOString()}`,
            `Diff Image Path: ${diffPath}`,
            `Added Elements: ${diff.addedElements.join(', ')}`,
            `Removed Elements: ${diff.removedElements.join(', ')}`
          ]
        }
      ]);
      graphStore.createRelations([
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
      ]);

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

      const highlightId = uuidv4();
      const snapshotDir = path.join(process.cwd(), 'snapshots-repo');
      const timestamp = new Date().toISOString();

      try {
        fs.writeFileSync(path.join(snapshotDir, `${highlightId}.png`), Buffer.from(screenshot, 'base64'));
        fs.writeFileSync(path.join(snapshotDir, `${highlightId}.json`), JSON.stringify({ url, selector, timestamp }, null, 2));
      } catch (e) {
        console.error('Error saving highlight snapshot:', e);
      }

      graphStore.createEntities([
        {
          name: `Snapshot_${highlightId}`,
          entityType: "DataArtifact",
          observations: [
            `Snapshot ID: ${highlightId}`,
            `URL: ${url}`,
            `Selector: ${selector}`,
            `Timestamp: ${timestamp}`,
            `Type: highlight`
          ]
        }
      ]);

      return {
        content: [
          {
            type: 'text',
            text: `Element '${selector}' highlighted and saved as snapshot ${highlightId}.`
          },
          {
            type: 'image',
            data: screenshot,
            mimeType: 'image/png'
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
        nodeResult = await new Promise((resolve) => {
          graphStore.openNodes([entityName], (result) => resolve(result));
        });
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
    case 'get_validation_results': {
      const { snapshotId } = args as { snapshotId: string };
      const snapshotEntityName = `Snapshot_${snapshotId}`;
      let nodeResult: any;
      try {
        nodeResult = await new Promise((resolve) => {
          graphStore.openNodes([snapshotEntityName], (result) => resolve(result));
        });
      } catch (e) {
        console.error('Error calling memory.open_nodes:', e);
        return {
          content: [
            {
              type: 'json',
              json: []
            }
          ]
        };
      }

      const relations = nodeResult?.relations || [];
      const validationResults: any[] = [];

      const validationLinks = relations.filter(
        (rel: any) =>
          rel.from === snapshotEntityName &&
          rel.relationType === 'producesValidationResult'
      );

      for (const rel of validationLinks) {
        const validationName = rel.to;
        let validationNodeResult: any;
        try {
          validationNodeResult = await new Promise((resolve) => {
            graphStore.openNodes([validationName], (result) => resolve(result));
          });
        } catch (e) {
          console.error('Error fetching validation node:', e);
          continue;
        }
        const entity = (validationNodeResult?.entities || []).find((e: any) => e.name === validationName);
        if (!entity) continue;

        const obs = entity.observations || [];
        let pass = false;
        let timestamp = '';
        let explanation = '';

        for (const ob of obs) {
          if (ob.toLowerCase().startsWith('pass:')) {
            pass = ob.toLowerCase().includes('true');
          } else if (ob.toLowerCase().startsWith('timestamp:')) {
            timestamp = ob.substring(ob.indexOf(':') + 1).trim();
          } else if (ob.toLowerCase().startsWith('explanation:')) {
            explanation = ob.substring(ob.indexOf(':') + 1).trim();
          }
        }

        validationResults.push({
          validationName,
          pass,
          timestamp,
          explanation
        });
      }

      return {
        content: [
          {
            type: 'json',
            json: validationResults
          }
        ]
      };
    }
    case 'get_snapshot_diffs': {
      const { snapshotId } = args as { snapshotId: string };
      const snapshotEntityName = `Snapshot_${snapshotId}`;
      let nodeResult: any;
      try {
        nodeResult = await new Promise((resolve) => {
          graphStore.openNodes([snapshotEntityName], (result) => resolve(result));
        });
      } catch (e) {
        console.error('Error calling memory.open_nodes:', e);
        return {
          content: [
            {
              type: 'json',
              json: []
            }
          ]
        };
      }

      const relations = nodeResult?.relations || [];
      const diffResults: any[] = [];

      const diffLinks = relations.filter(
        (rel: any) =>
          (rel.to === snapshotEntityName &&
            (rel.relationType === 'comparesSourceSnapshot' || rel.relationType === 'comparesTargetSnapshot'))
      );

      for (const rel of diffLinks) {
        const diffName = rel.from;
        let diffNodeResult: any;
        try {
          diffNodeResult = await new Promise((resolve) => {
            graphStore.openNodes([diffName], (result) => resolve(result));
          });
        } catch (e) {
          console.error('Error fetching diff node:', e);
          continue;
        }
        const entity = (diffNodeResult?.entities || []).find((e: any) => e.name === diffName);
        if (!entity) continue;

        const obs = entity.observations || [];
        let timestamp = '';
        let summary = '';
        let sourceSnapshotId = '';
        let targetSnapshotId = '';

        for (const ob of obs) {
          if (ob.toLowerCase().startsWith('timestamp:')) {
            timestamp = ob.substring(ob.indexOf(':') + 1).trim();
          } else if (ob.toLowerCase().startsWith('summary:')) {
            summary = ob.substring(ob.indexOf(':') + 1).trim();
          } else if (ob.toLowerCase().startsWith('source snapshot id:')) {
            sourceSnapshotId = ob.substring(ob.indexOf(':') + 1).trim();
          } else if (ob.toLowerCase().startsWith('target snapshot id:')) {
            targetSnapshotId = ob.substring(ob.indexOf(':') + 1).trim();
          }
        }

        diffResults.push({
          diffName,
          timestamp,
          summary,
          sourceSnapshotId,
          targetSnapshotId
        });
      }

      return {
        content: [
          {
            type: 'json',
            json: diffResults
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
