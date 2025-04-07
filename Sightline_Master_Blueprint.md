# Sightline MCP Suite — Ultra-Detailed Master Blueprint

---

## Phase 1: System Overview

[...existing content retained here...]

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
