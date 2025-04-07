# Sightline MCP Server — Master Plan

A comprehensive roadmap to build a standalone MCP server that provides visual + semantic UI validation for AI agents.

---

## Overview

Sightline is an MCP-compatible tool designed to help AI agents **verify** their UI changes by capturing the real-time state of a web app — including screenshots, DOM structure, styles, layout, and text content — and comparing it against expected outcomes.

---

## Phases

### 1. Define Architecture & Schemas

- Design strict JSON schemas for all tool inputs and outputs.
- Ensure schemas are compatible with MCP standards.
- Plan for core data types: screenshot (base64), DOM tree (JSON/HTML), styles, bounding boxes, text content, validation results, diffs.

---

### 2. Scaffold the Project

- Bootstrap a **Node.js + TypeScript** project.
- Use the MCP SDK to create a new server (similar to weather-server example).
- Set up build scripts and project structure.
- Create placeholders for all core tool handlers:
  - `take_snapshot`
  - `validate_fix`
  - `get_dom_structure`
  - `compare_snapshots`
  - `highlight_element`

---

### 3. Implement Core Features

- Use **Puppeteer** or **Playwright** to:
  - Launch a headless browser.
  - Navigate to a target URL.
  - Capture a screenshot (base64).
  - Extract the DOM tree.
  - Collect computed styles and bounding boxes.
  - Extract text content.
- Store snapshots with unique IDs for later comparison.
- Implement validation logic to compare current UI state with expected properties.

---

### 4. Expose MCP-Compatible Tools

- Define JSON schemas for each tool:
  - **`take_snapshot`**: Inputs (URL, viewport), Outputs (screenshot, DOM, styles, bounding boxes, text).
  - **`validate_fix`**: Inputs (selector, expected properties), Outputs (pass/fail, explanation).
  - **`get_dom_structure`**: Inputs (URL), Outputs (DOM/HTML).
  - **`compare_snapshots`**: Inputs (before/after IDs), Outputs (diff summary).
  - **`highlight_element`**: Inputs (selector, color), Outputs (status).
- Register these tools with the MCP SDK.

---

### 5. Test with Agent Workflows

- Simulate an agent making UI changes.
- Call `take_snapshot` to capture the new state.
- Use `validate_fix` to check if the change succeeded.
- Use `compare_snapshots` to visualize differences.
- Use `highlight_element` for debugging.
- Refine schemas and responses based on test results.

---

### 6. Plan Future Extensions

- Integrate **GPT-4o** or other vision models for natural language UI descriptions.
- Add snapshot history management.
- Enable **human-in-the-loop** validation workflows.
- Support **multi-agent** coordination.
- Package the server for easy deployment.
- Document the API thoroughly.
- Provide example clients and usage guides.

---

### 7. Package & Document

- Finalize codebase and ensure stability.
- Write clear documentation for all endpoints and schemas.
- Prepare example agent scripts.
- Package for distribution and integration into agent ecosystems.

---

## Summary

Sightline will enable AI agents to **see**, **understand**, and **verify** their UI changes with high confidence, dramatically improving debugging and automation workflows.

---

*This plan is stored in the knowledge graph and can be iterated upon as development progresses.*
