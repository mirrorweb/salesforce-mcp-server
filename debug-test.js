#!/usr/bin/env node

/**
 * Debug test to see actual error messages from tools
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugTest() {
  console.log('🚀 Starting debug test...');
  
  const serverProcess = spawn('node', [join(__dirname, 'build/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
  });

  // Wait for server to start
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
      console.log('Server stderr:', data.toString());
      if (output.includes('Server started successfully')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  console.log('✅ Server started, testing test-connection...');

  // Test just the connection tool with detailed output
  const request = {
    jsonrpc: "2.0",
    id: "test-1",
    method: "tools/call",
    params: {
      name: "test-connection",
      arguments: {}
    }
  };

  let response = '';
  
  const responsePromise = new Promise((resolve) => {
    const dataHandler = (data) => {
      response += data.toString();
      console.log('Server stdout:', data.toString());
      
      try {
        const lines = response.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.trim()) {
            const parsed = JSON.parse(line);
            if (parsed.id === "test-1") {
              serverProcess.stdout.removeListener('data', dataHandler);
              resolve(parsed);
              return;
            }
          }
        }
      } catch (e) {
        // Continue collecting data
      }
    };

    serverProcess.stdout.on('data', dataHandler);
  });

  console.log('Sending request:', JSON.stringify(request, null, 2));
  serverProcess.stdin.write(JSON.stringify(request) + '\n');

  const result = await responsePromise;
  console.log('Received response:', JSON.stringify(result, null, 2));

  if (result.result && result.result.content) {
    const content = result.result.content[0]?.text;
    if (content) {
      console.log('Response content:', content);
    }
  }

  serverProcess.kill();
}

debugTest().catch(console.error);
