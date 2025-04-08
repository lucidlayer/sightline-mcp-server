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










PS C:\Dev\Projects\sightline-mcp-server> cd sightline-mcp-server
PS C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server> npm install

added 174 packages, and audited 175 packages in 11s

22 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
PS C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server> npx tsc
src/index.ts:128:26 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'ZodObject<{ method: ZodLiteral<string>; }, UnknownKeysParam, ZodTypeAny, { method: string; }, { method: string; }>'.

128 server.setRequestHandler('call_tool_request', async (req) => {
                             ~~~~~~~~~~~~~~~~~~~

src/index.ts:129:41 - error TS2339: Property 'params' does not exist on type '{ method: string; }'.

129   const { name, arguments: args } = req.params;
                                            ~~~~~~

src/index.ts:192:52 - error TS2339: Property 'params' does not exist on type '{ method: string; }'.

192       const { snapshot, expectedProperties } = req.params.arguments as any;
                                                       ~~~~~~

src/index.ts:252:44 - error TS2339: Property 'params' does not exist on type '{ method: string; }'.

252       const { snapshot1, snapshot2 } = req.params.arguments as any;
                                               ~~~~~~

src/index.ts:344:37 - error TS2339: Property 'params' does not exist on type '{ method: string; }'.

344       const { url, selector } = req.params.arguments as any;
                                        ~~~~~~


Found 5 errors in the same file, starting at: src/index.ts:128

PS C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server> node src/index.js
C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server\node_modules\@modelcontextprotocol\sdk\dist\cjs\shared\protocol.js:316
        const method = requestSchema.shape.method.value;
                                           ^

TypeError: Cannot read properties of undefined (reading 'method')
    at Server.setRequestHandler (C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server\node_modules\@modelcontextprotocol\sdk\dist\cjs\shared\protocol.js:316:44)
    at Object.<anonymous> (C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server\src\index.js:121:8)
    at Module._compile (node:internal/modules/cjs/loader:1554:14)
    at Object..js (node:internal/modules/cjs/loader:1706:10)
    at Module.load (node:internal/modules/cjs/loader:1289:32)
    at Function._load (node:internal/modules/cjs/loader:1108:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:220:24)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:170:5)
    at node:internal/main/run_main_module:36:49

Node.js v22.14.0
PS C:\Dev\Projects\sightline-mcp-server\sightline-mcp-server> 