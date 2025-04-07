# Sightline MCP Suite — Ultra-Detailed Master Blueprint

---

## Phase 1: System Overview

---

### 1.1. **Core Goals**

- Provide a **ground-truth validation layer** for AI agents modifying UIs.
- Enable **multi-modal, real-time feedback**: visual, DOM, styles, layout, text.
- Support **explainable, iterative agent workflows**.
- Be **fully open-source, self-hosted, and free of paid APIs**.
- Facilitate **persistent knowledge, auditability, and reproducibility**.
- Modular, extensible, and composable via **MCP tools**.

---

### 1.2. **User Personas**

- **Agent Developer:**  
  - Builds AI agents that modify UIs.  
  - Needs reliable validation, debugging, and iteration support.  
  - Wants to automate UI fixes confidently.

- **AI Agent:**  
  - Consumes MCP tools to perform fixes, validate, and plan next steps.  
  - Needs rich, structured feedback to avoid blind retries.

- **Human Reviewer:**  
  - Oversees agent workflows.  
  - Reviews snapshots, diffs, validation reports.  
  - Intervenes when automation fails.

---

### 1.3. **Core Use Cases**

- **Automated UI Fix Validation:**  
  After an agent changes code, Sightline captures the UI state and validates if the fix worked.

- **Debugging Failed Fixes:**  
  When validation fails, Sightline provides detailed diffs and explanations to guide retries.

- **Iterative Agent Workflows:**  
  Agents use Sightline feedback to plan next fix attempts, avoiding wasted cycles.

- **Audit & Learning:**  
  All snapshots, validations, and diffs are stored for future analysis and training.

---

### 1.4. **High-Level Architecture**

- **Agents** interact with **Sightline MCP Suite** via MCP tools.
- **Sightline** consists of modular servers/components:
  - **Snapshot Engine**
  - **Markdown Converter**
  - **Validation Engine**
  - **Diff Engine**
  - **Task Manager**
  - **Reasoning Engine**
  - **Memory Graph**
  - **Filesystem Storage**

---

### 1.5. **Data Flow Diagram (Textual)**

1. **Agent** triggers a **UI change**.
2. Calls **Snapshot Engine** → captures multi-modal UI state.
3. Calls **Validation Engine** with expected properties.
4. If **fail**, calls **Diff Engine** to compare before/after.
5. Calls **Markdown Converter** for summaries.
6. Updates **Task Manager** with next steps.
7. Uses **Reasoning Engine** to plan retries.
8. Stores all data in **Memory Graph** and **Filesystem**.
9. **Agent** decides to retry, escalate, or finish.

---

### 1.6. **Component Interaction Map**

- **Snapshot Engine** feeds data to **Validation** and **Diff**.
- **Validation Engine** outputs pass/fail + explanation.
- **Diff Engine** highlights changes.
- **Markdown Converter** summarizes UI state.
- **Task Manager** orchestrates multi-step workflows.
- **Reasoning Engine** guides agent decisions.
- **Memory Graph** stores entities, relations, observations.
- **Filesystem** persists raw data, logs, reports.

---

### 1.7. **Sequence Diagram: Typical Fix-Validate Cycle**

```
Agent → Task Manager: plan fix → validate
Task Manager → Snapshot Engine: capture before
Agent → Codebase: apply fix
Task Manager → Snapshot Engine: capture after
Task Manager → Validation Engine: compare after to expected
Validation Engine → Task Manager: pass/fail + explanation
If fail:
  Task Manager → Diff Engine: diff before/after
  Task Manager → Markdown Converter: summarize after
  Task Manager → Reasoning Engine: plan next fix
  Loop or escalate
Else:
  Task Manager: mark task complete
All data → Memory Graph + Filesystem
```

---

### 1.8. **Design Rationale**

- **Multi-modal feedback** closes the loop for agents.
- **Modular MCP tools** enable composability and extensibility.
- **Persistent storage** supports learning and audit.
- **Local, open-source stack** avoids API costs and privacy issues.
- **Task + Reasoning layers** enable explainable, iterative workflows.

---

## Phase 2: Component Specifications

---

### 2.1. **Snapshot & Scraping Engine**

---

#### 2.1.1. **Purpose**

- Capture a **multi-modal, ground-truth snapshot** of the UI after each agent change.
- Provide **visual, structural, and semantic data** for validation and reasoning.

---

#### 2.1.2. **Architecture**

- **Core:** Puppeteer or Playwright headless browser instance.
- **Controller:** Node.js service exposing MCP-compatible `/take_snapshot` tool.
- **Data Pipeline:**
  - Navigate to target URL.
  - Wait for page load + optional custom events.
  - Capture:
    - **Screenshot** (base64 PNG).
    - **DOM tree** (serialized JSON or HTML).
    - **Computed styles** for all elements.
    - **Bounding boxes** (layout info).
    - **Text content**.
  - Package into a structured snapshot object.
  - Store raw data in Filesystem, metadata in Memory graph.

---

#### 2.1.3. **Inputs**

- `url` (string): Target page URL.
- `viewport` (object): Width, height, device scale factor.
- `waitUntil` (string): Load event (`load`, `domcontentloaded`, `networkidle0`).
- `delay` (int, ms): Optional wait after load.
- `selectors` (array): Optional CSS selectors to focus on.
- `captureOptions` (object): Flags for screenshot, DOM, styles, layout, text.

---

#### 2.1.4. **Outputs**

```json
{
  "screenshot": "base64...",
  "domTree": {...},
  "styles": {...},
  "boundingBoxes": {...},
  "textContent": {...},
  "metadata": {
    "url": "...",
    "timestamp": "...",
    "viewport": {...}
  }
}
```

---

#### 2.1.5. **Internal Data Models**

- **DOM Tree:**  
  Recursive JSON with node type, tag, attributes, children, text.

- **Styles:**  
  Map of selector or node ID → computed CSS properties.

- **Bounding Boxes:**  
  Map of selector or node ID → `{x, y, width, height}`.

- **Text Content:**  
  Map of selector or node ID → string.

---

#### 2.1.6. **Algorithms**

- **DOM Extraction:**  
  Use `page.evaluate()` to serialize DOM recursively, including shadow DOM.

- **Style Computation:**  
  For each node, call `getComputedStyle()` and serialize properties.

- **Bounding Box Calculation:**  
  Use `getBoundingClientRect()` for layout info.

- **Screenshot Capture:**  
  Use Puppeteer/Playwright screenshot API, base64 encode.

- **Selective Capture:**  
  If selectors provided, limit extraction to those subtrees.

---

#### 2.1.7. **Edge Cases**

- **Dynamic Content:**  
  Use configurable delays or event hooks to wait for UI stabilization.

- **Animations:**  
  Optionally disable CSS animations/transitions before capture.

- **Shadow DOM:**  
  Recursively traverse and serialize.

- **Cross-Origin Iframes:**  
  Limited access; capture bounding box and metadata only.

- **Large Pages:**  
  Use chunked traversal or sampling to avoid memory issues.

---

#### 2.1.8. **Error Handling**

- **Navigation Failures:**  
  Timeout, invalid URL, network errors → detailed error codes.

- **Script Errors:**  
  DOM extraction failures → partial data + warnings.

- **Resource Limits:**  
  Memory or timeouts → partial snapshot + error flag.

- **Invalid Inputs:**  
  Schema validation with clear messages.

---

#### 2.1.9. **Extensibility Hooks**

- **Custom Wait Conditions:**  
  User scripts or events before capture.

- **Additional Data:**  
  Network requests, console logs, performance metrics.

- **Alternate Formats:**  
  Save DOM as HTML, XML, or other serializations.

- **Plugin System:**  
  For custom extraction logic.

---

#### 2.1.10. **Performance Considerations**

- **Parallelization:**  
  Batch multiple snapshots if needed.

- **Caching:**  
  Avoid redundant captures on unchanged pages.

- **Resource Cleanup:**  
  Close browser contexts promptly.

---

#### 2.1.11. **Security**

- **Sandboxed Browser:**  
  Isolate page execution.

- **Input Validation:**  
  Prevent SSRF or malicious URLs.

- **Output Sanitization:**  
  Avoid leaking sensitive data.

---

*Next: 2.2 Markdown Conversion Layer (to be expanded).*
