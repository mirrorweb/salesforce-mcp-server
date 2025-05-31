#!/usr/bin/env node

/**
 * Test script for Salesforce MCP Server Phase 2 tools
 * Tests each tool individually to ensure they work correctly
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
  }

  async startServer() {
    console.log('🚀 Starting Salesforce MCP Server...');
    
    this.serverProcess = spawn('node', [join(__dirname, '../build/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: join(__dirname, '..')
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      this.serverProcess.stderr.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server started successfully')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      this.serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    console.log('✅ Server started successfully');
  }

  async sendMCPRequest(request) {
    return new Promise((resolve, reject) => {
      let response = '';
      let responseReceived = false;

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Request timeout'));
        }
      }, 30000);

      const dataHandler = (data) => {
        response += data.toString();
        try {
          // Try to parse each line as JSON
          const lines = response.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);
              if (parsed.id === request.id) {
                clearTimeout(timeout);
                responseReceived = true;
                this.serverProcess.stdout.removeListener('data', dataHandler);
                resolve(parsed);
                return;
              }
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      this.serverProcess.stdout.on('data', dataHandler);
      
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testTool(toolName, args = {}) {
    console.log(`\n🧪 Testing tool: ${toolName}`);
    
    try {
      const request = {
        jsonrpc: "2.0",
        id: Math.random().toString(36).substring(7),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };

      const response = await this.sendMCPRequest(request);
      
      if (response.error) {
        console.log(`❌ ${toolName} failed:`, response.error);
        this.testResults.push({ tool: toolName, success: false, error: response.error });
        return false;
      }

      if (response.result && response.result.content) {
        const content = response.result.content[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.success) {
            console.log(`✅ ${toolName} succeeded`);
            console.log(`   Data preview:`, JSON.stringify(parsed.data || parsed, null, 2).substring(0, 200) + '...');
            this.testResults.push({ tool: toolName, success: true, data: parsed });
            return true;
          } else {
            console.log(`❌ ${toolName} returned success: false`);
            this.testResults.push({ tool: toolName, success: false, error: parsed });
            return false;
          }
        }
      }

      console.log(`❌ ${toolName} returned unexpected response format`);
      this.testResults.push({ tool: toolName, success: false, error: 'Unexpected response format' });
      return false;

    } catch (error) {
      console.log(`❌ ${toolName} threw error:`, error.message);
      this.testResults.push({ tool: toolName, success: false, error: error.message });
      return false;
    }
  }

  async runAllTests() {
    try {
      await this.startServer();

      // Test 1: test-connection
      await this.testTool('test-connection');

      // Test 2: execute-soql (simple query)
      await this.testTool('execute-soql', {
        query: 'SELECT Id, Name FROM Organization LIMIT 1'
      });

      // Test 3: execute-sosl (simple search)
      await this.testTool('execute-sosl', {
        searchQuery: 'FIND {test} IN ALL FIELDS RETURNING Account(Id, Name LIMIT 5)'
      });

      // Test 4: describe-sobject
      await this.testTool('describe-sobject', {
        sobjectType: 'Account'
      });

      // Print summary
      console.log('\n📊 Test Summary:');
      const successful = this.testResults.filter(r => r.success).length;
      const total = this.testResults.length;
      
      console.log(`✅ Successful: ${successful}/${total}`);
      console.log(`❌ Failed: ${total - successful}/${total}`);

      if (successful === total) {
        console.log('\n🎉 All tools are working correctly!');
        return true;
      } else {
        console.log('\n⚠️  Some tools failed. Check the errors above.');
        return false;
      }

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return false;
    } finally {
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
    }
  }
}

// Run tests
const tester = new MCPTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
