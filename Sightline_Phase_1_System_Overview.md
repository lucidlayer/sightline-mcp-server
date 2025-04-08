# Sightline MCP Suite — Phase 1: System Overview (Ultra-Detailed)

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

*End of Phase 1. Next: Phase 2 — Component Specifications (separate file).*
