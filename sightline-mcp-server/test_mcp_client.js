const { spawn } = require('child_process');

const server = spawn('node', ['src/index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'inherit']
});

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

const requests = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "call_tool_request",
    params: {
      name: "take_snapshot",
      arguments: {
        url: "https://example.com",
        fullPage: true
      }
    }
  },
  {
    jsonrpc: "2.0",
    id: 2,
    method: "call_tool_request",
    params: {
      name: "validate_fix",
      arguments: {
        snapshot: {
          dom: "<html></html>",
          styles: ""
        },
        expectedProperties: {
          selectors: ["body"],
          textContent: {},
          styles: {}
        }
      }
    }
  },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "call_tool_request",
    params: {
      name: "compare_snapshots",
      arguments: {
        snapshot1: {
          dom: "<html><body><h1>Old</h1></body></html>",
          styles: ""
        },
        snapshot2: {
          dom: "<html><body><h1>New</h1></body></html>",
          styles: ""
        }
      }
    }
  },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "call_tool_request",
    params: {
      name: "highlight_element",
      arguments: {
        url: "https://example.com",
        selector: "h1"
      }
    }
  }
];

for (const req of requests) {
  server.stdin.write(JSON.stringify(req) + '\n');
}
