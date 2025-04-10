# sightline-mcp-server

To test the Sightline MCP server locally on a fresh system without external dependencies, follow these steps:

Clone or copy the Sightline MCP server project to your laptop.

Open a terminal and navigate to the project directory:

cd path/to/sightline-mcp-server
Install dependencies:
npm install
Compile the TypeScript code:
npx tsc
Run the MCP server:
node src/index.js
You should see Sightline MCP server running.

In a separate terminal, prepare a simple JSON-RPC request file, e.g., take_snapshot.json:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "call_tool_request",
  "params": {
    "name": "take_snapshot",
    "arguments": {
      "url": "https://example.com",
      "fullPage": true
    }
  }
}
Send the request to the running server:
Option A: Use a script or tool that connects to the server's stdin/stdout (advanced).
Option B: Use Cline's built-in MCP integration (recommended):
Add the server to your Cline MCP config as before.
Restart Cline.
Use Cline's UI or commands to invoke take_snapshot and other tools.
Verify the server's response in the terminal or Cline interface.


---
Take a snapshot of https://example.com, then validate that the page contains the text 'Example Domain'. If validation fails, compare snapshots and generate a markdown summary.

---
I just updated the homepage at https://example.com to change the headline from 'Example Domain' to 'Welcome to Sightline'.

Please:

Take a snapshot of https://example.com.
Validate that the headline now says 'Welcome to Sightline'.
If validation fails, compare the new snapshot with the previous one.
Generate a markdown summary of the differences.
Store all snapshots and validation results persistently.
Explain what changed and whether the fix succeeded.

---