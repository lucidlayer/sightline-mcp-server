# Sightline MCP Suite — Comprehensive Architecture & Implementation Plan

---

## 0. **Core Objective**

Build a **self-contained, open-source MCP server suite** that enables AI agents to **verify, understand, and iterate on UI changes** by capturing multi-modal snapshots, performing validation, and orchestrating fix workflows — **without relying on paid APIs**.

---

## 1. **Pain Point**

- Agents often **assume** their UI fix worked.
- No **ground truth** feedback → silent failures, wasted retries, debugging hell.
- Need **multi-modal, real-time validation** to close the loop.

---

## 2. **Solution Overview**

Sightline acts as a **validation layer** that:

- Captures **visual + semantic snapshots** of the UI after each change.
- Compares **expected vs. actual** UI state.
- Provides **rich feedback** (images, DOM, styles, diffs, summaries).
- Stores all data for **reasoning, learning, and audit**.
- Orchestrates **multi-step fix/validate workflows**.
- Enables **explainable, iterative agent behavior**.

---

## 3. **Core Components & How They Work**

### 3.1. **Snapshot & Scraping Engine**

- **Tech:** Puppeteer or Playwright (local, free)
- **Functions:**
  - Launch headless browser, navigate to target URL.
  - Capture **screenshot** (base64 PNG).
  - Extract **full DOM tree** (as JSON or HTML).
  - Collect **computed styles** for all elements.
  - Get **bounding boxes** (layout info).
  - Extract **text content**.
- **Output:**  
  ```json
  {
    "screenshot": "...",
    "domTree": {...},
    "styles": {...},
    "boundingBoxes": {...},
    "textContent": {...}
  }
  ```
- **Stored in:** Filesystem + Memory graph (with timestamp, URL, agent info).

---

### 3.2. **Markdown Conversion Layer**

- **Tech:** Turndown, Readability.js, Tesseract.js (OCR)
- **Functions:**
  - Convert **HTML/DOM** to clean Markdown.
  - OCR images/screenshots to extract text.
  - Summarize complex UI into **digestible text**.
- **Purpose:**  
  - Easier for agents to **parse, compare, and reason**.
  - Enables **text-based diffing** and validation.

---

### 3.3. **Validation Engine**

- **Inputs:**  
  - Snapshot data  
  - **Expected properties** (e.g., button text, size, visibility)
- **Functions:**
  - Compare **actual UI state** to **expected**.
  - Check text, styles, layout, presence/absence.
  - Return **pass/fail + detailed explanation**.
- **Output:**  
  ```json
  {
    "result": true/false,
    "explanation": "Font size mismatch. Expected 16px, found 12px."
  }
  ```
- **Stored in:** Memory graph + Filesystem logs.

---

### 3.4. **Diff Engine**

- **Functions:**
  - Compare **before/after snapshots**.
  - Visual diff (image comparison, highlight changes).
  - DOM diff (added/removed/moved nodes).
  - Style diff (CSS changes).
  - Text diff (content changes).
- **Purpose:**  
  - Help agents **see what actually changed**.
  - Guide next fix attempts.

---

### 3.5. **Task Orchestration Layer**

- **Tech:** Local task queue (JSON/SQLite)
- **Functions:**
  - Accept **task lists** (e.g., fix button → validate → diff → retry).
  - Manage **task states** (pending, running, done, failed).
  - Support **branching, retries, dependencies**.
  - Expose via MCP tool interface.
- **Purpose:**  
  - Enable **multi-step, stateful workflows**.
  - Coordinate **agent actions + Sightline validation**.

---

### 3.6. **Sequential Reasoning Engine**

- **Tech:** Clone/customize sequentialthinking server
- **Functions:**
  - Guide **step-by-step problem solving**.
  - Support **revisions, branching, hypothesis testing**.
  - Help agents **reflect, debug, and plan**.
- **Purpose:**  
  - Make agent behavior **explainable and iterative**.
  - Avoid blind trial-and-error.

---

### 3.7. **Knowledge Graph Memory**

- **Tech:** Clone/customize memory server
- **Functions:**
  - Store **entities** (snapshots, UI elements, fixes).
  - Store **relations** (e.g., snapshot A → fix attempt B).
  - Store **observations** (validation results, diffs).
  - Support **search, retrieval, update**.
- **Purpose:**  
  - Provide **persistent, queryable context**.
  - Enable **learning from past attempts**.

---

### 3.8. **Filesystem Storage**

- **Tech:** Clone/customize filesystem server
- **Functions:**
  - Save **snapshots, diffs, logs, reports**.
  - Manage **project files**.
  - Support **search, metadata, versioning**.
- **Purpose:**  
  - Provide **persistent, auditable storage**.
  - Enable **reproducibility and debugging**.

---

## 4. **MCP Tool Interfaces**

Each component exposes **MCP-compatible tools** with strict JSON schemas:

- `/take_snapshot`
- `/convert_to_markdown`
- `/validate_fix`
- `/compare_snapshots`
- `/highlight_element`
- `/plan_tasks`
- `/step_thinking`
- `/store_memory`
- `/query_memory`
- `/save_file`
- `/read_file`

Agents can **compose these tools** into complex workflows.

---

## 5. **Workflow Example**

1. **Agent** makes a UI change.
2. Calls **`/take_snapshot`** → gets multi-modal UI state.
3. Calls **`/validate_fix`** with expected properties.
4. If **fail**, calls **`/compare_snapshots`** to see what changed.
5. Uses **`/convert_to_markdown`** for easier reasoning.
6. Updates **task plan** via **`/plan_tasks`**.
7. Reflects with **`/step_thinking`**.
8. Stores all data in **memory** and **filesystem**.
9. Retries or escalates based on insights.

---

## 6. **Benefits**

- **No paid APIs** — fully open-source, local, and private.
- **Multi-modal feedback** — visual + semantic + structural.
- **Explainable, iterative agent behavior**.
- **Persistent knowledge** for learning and debugging.
- **Composable tools** for flexible workflows.
- **Auditability and reproducibility**.

---

## 7. **Next Steps**

- Scaffold each component as a standalone MCP server or module.
- Define strict JSON schemas for all tools.
- Implement core features incrementally.
- Integrate into a unified Sightline suite.
- Test with example agent workflows.
- Iterate and extend.

---

*This file serves as a comprehensive blueprint for building Sightline's full MCP suite.*
