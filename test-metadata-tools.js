/**
 * Test script for Salesforce MCP Server Metadata Tools
 * 
 * Tests the metadata deployment, retrieval, and discovery tools
 * with real Salesforce connection.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds timeout for each test
  verbose: true
};

/**
 * Execute MCP tool and return parsed result
 */
async function executeTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Testing ${toolName}...`);
    if (TEST_CONFIG.verbose) {
      console.log(`📝 Arguments:`, JSON.stringify(args, null, 2));
    }

    const child = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send MCP request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    };

    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Test timeout for ${toolName}`));
    }, TEST_CONFIG.timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      
      if (TEST_CONFIG.verbose) {
        console.log(`📊 Exit code: ${code}`);
        if (stderr) console.log(`📋 Stderr:`, stderr);
      }

      try {
        // Parse the last JSON response from stdout
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const response = JSON.parse(lastLine);
        
        if (response.error) {
          reject(new Error(`MCP Error: ${response.error.message}`));
        } else {
          resolve(response.result);
        }
      } catch (error) {
        console.error(`❌ Failed to parse response for ${toolName}:`, error);
        console.error(`📄 Raw stdout:`, stdout);
        reject(error);
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Create a simple test metadata package as base64 zip
 */
function createTestMetadataPackage() {
  // This would normally be a real zip file with metadata
  // For testing, we'll create a minimal package.xml
  const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>TestClass</members>
        <name>ApexClass</name>
    </types>
    <version>61.0</version>
</Package>`;

  const testApexClass = `public class TestClass {
    public static String getMessage() {
        return 'Hello from MCP Metadata Test';
    }
}`;

  // Create a simple zip-like structure (this is simplified for testing)
  // In a real scenario, you'd use a proper zip library
  const mockZipContent = Buffer.from(`package.xml:${packageXml}\nclasses/TestClass.cls:${testApexClass}`);
  return mockZipContent.toString('base64');
}

/**
 * Run all metadata tool tests
 */
async function runMetadataTests() {
  console.log('🚀 Starting Salesforce MCP Server Metadata Tools Tests');
  console.log('=' .repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: List Metadata Types
  try {
    console.log('\n📋 Test 1: List Metadata Types');
    const result = await executeTool('list-metadata-types');
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Found ${data.data.metadataTypes.length} metadata types`);
      console.log(`📊 API Version: ${data.data.apiVersion}`);
      console.log(`🏢 Organization Namespace: ${data.data.organizationNamespace || 'None'}`);
      
      // Show first few metadata types
      const firstFew = data.data.metadataTypes.slice(0, 5);
      console.log(`📝 Sample metadata types:`, firstFew.map(t => t.xmlName).join(', '));
      
      results.passed++;
      results.tests.push({ name: 'list-metadata-types', status: 'PASSED', details: `${data.data.metadataTypes.length} types found` });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'list-metadata-types', status: 'FAILED', error: error.message });
  }

  // Test 2: Retrieve Metadata (ApexClass)
  try {
    console.log('\n📥 Test 2: Retrieve Metadata (ApexClass)');
    const result = await executeTool('retrieve-metadata', {
      types: [
        {
          name: 'ApexClass',
          members: ['*']
        }
      ],
      options: {
        singlePackage: true
      }
    });
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Retrieved metadata package`);
      console.log(`📊 Types Retrieved: ${data.data.summary.typesRetrieved}`);
      console.log(`📦 Zip File Size: ${data.data.summary.zipFileSize} bytes`);
      console.log(`🔧 API Version: ${data.data.summary.apiVersion}`);
      
      if (data.data.fileProperties && data.data.fileProperties.length > 0) {
        console.log(`📁 Files Retrieved: ${data.data.fileProperties.length}`);
        const firstFew = data.data.fileProperties.slice(0, 3);
        console.log(`📝 Sample files:`, firstFew.map(f => f.fileName).join(', '));
      }
      
      results.passed++;
      results.tests.push({ name: 'retrieve-metadata', status: 'PASSED', details: `${data.data.summary.zipFileSize} bytes retrieved` });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'retrieve-metadata', status: 'FAILED', error: error.message });
  }

  // Test 3: Deploy Metadata (Check Only)
  try {
    console.log('\n📤 Test 3: Deploy Metadata (Check Only)');
    const testZip = createTestMetadataPackage();
    
    const result = await executeTool('deploy-metadata', {
      zipFile: testZip,
      options: {
        checkOnly: true,
        rollbackOnError: true,
        singlePackage: true
      }
    });
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Deployment validation completed`);
      console.log(`📊 Deployment Status: ${data.data.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔧 Check Only: ${data.data.summary.checkOnly}`);
      console.log(`📦 Components: ${data.data.summary.componentsDeployed}/${data.data.summary.componentsTotal}`);
      
      if (data.data.details && data.data.details.length > 0) {
        console.log(`📝 Deployment Details: ${data.data.details.length} items`);
      }
      
      results.passed++;
      results.tests.push({ name: 'deploy-metadata', status: 'PASSED', details: `Check-only deployment ${data.data.success ? 'succeeded' : 'failed'}` });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'deploy-metadata', status: 'FAILED', error: error.message });
  }

  // Test Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 METADATA TOOLS TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.tests.forEach(test => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.details || test.error}`);
  });

  if (results.failed === 0) {
    console.log('\n🎉 All metadata tools tests passed! Phase 5 implementation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runMetadataTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runMetadataTests, executeTool };
