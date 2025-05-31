/**
 * Test script for Apex Development Tools
 * Tests execute-apex, run-apex-tests, and get-apex-logs tools
 */

const { spawn } = require('child_process');

// Test configuration
const tests = [
  {
    name: 'execute-apex',
    description: 'Execute simple anonymous Apex code',
    input: {
      name: 'execute-apex',
      arguments: {
        apexCode: 'System.debug("Hello from MCP Server!");',
        captureDebugLogs: true
      }
    }
  },
  {
    name: 'execute-apex-with-error',
    description: 'Execute Apex code with compilation error',
    input: {
      name: 'execute-apex',
      arguments: {
        apexCode: 'System.debug("Missing semicolon")',
        captureDebugLogs: false
      }
    }
  },
  {
    name: 'get-apex-logs',
    description: 'Retrieve recent debug logs',
    input: {
      name: 'get-apex-logs',
      arguments: {
        limit: 5
      }
    }
  },
  {
    name: 'run-apex-tests',
    description: 'Run all Apex tests (if any exist)',
    input: {
      name: 'run-apex-tests',
      arguments: {
        includeCoverage: true
      }
    }
  }
];

async function testTool(test) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${test.name} - ${test.description}`);
    console.log(`📤 Input:`, JSON.stringify(test.input, null, 2));
    
    const child = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      console.log(`📥 Stderr:`, stderr);
      
      try {
        // Parse the JSON-RPC response
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        
        if (lastLine) {
          const response = JSON.parse(lastLine);
          console.log(`📥 Response:`, JSON.stringify(response, null, 2));
          
          if (response.result) {
            console.log(`✅ ${test.name}: SUCCESS`);
          } else if (response.error) {
            console.log(`❌ ${test.name}: ERROR - ${response.error.message}`);
          }
        } else {
          console.log(`❌ ${test.name}: No response received`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Failed to parse response - ${error.message}`);
        console.log(`Raw stdout:`, stdout);
      }
      
      resolve();
    });
    
    // Send the JSON-RPC request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: test.input
    };
    
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Apex Tools Test Suite');
  console.log('=====================================');
  
  for (const test of tests) {
    await testTool(test);
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 All tests completed!');
}

// Run the tests
runTests().catch(console.error);
