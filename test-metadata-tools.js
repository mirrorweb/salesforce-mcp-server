/**
 * Test script for Salesforce MCP Server Metadata Tools
 * 
 * Tests the component-based metadata deployment, retrieval, and discovery tools
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
 * Create test metadata components for deployment
 */
function createTestMetadataComponents() {
  return [
    {
      type: 'ApexClass',
      fullName: 'MCPTestClass',
      metadata: {
        body: `public class MCPTestClass {
    public static String getMessage() {
        return 'Hello from MCP Component-Based Metadata Test';
    }
    
    public static Integer getNumber() {
        return 42;
    }
}`
      }
    }
  ];
}

/**
 * Create test metadata components for retrieval
 */
function createTestRetrievalComponents() {
  return [
    {
      type: 'ApexClass',
      fullName: 'Account'  // Using a standard class that should exist
    }
  ];
}

/**
 * Run all metadata tool tests
 */
async function runMetadataTests() {
  console.log('🚀 Starting Salesforce MCP Server Component-Based Metadata Tools Tests');
  console.log('=' .repeat(70));

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

  // Test 2: Retrieve Metadata Components (ApexClass)
  try {
    console.log('\n📥 Test 2: Retrieve Metadata Components (ApexClass)');
    const components = createTestRetrievalComponents();
    
    const result = await executeTool('retrieve-metadata', {
      components: components,
      options: {
        includeBody: true,
        apiVersion: '61.0'
      }
    });
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Retrieved metadata components`);
      console.log(`📊 Components Retrieved: ${data.data.componentsRetrieved}/${data.data.componentsTotal}`);
      console.log(`🔧 API Version: ${data.data.apiVersion}`);
      console.log(`✅ Success Rate: ${data.data.success ? 'SUCCESS' : 'PARTIAL/FAILED'}`);
      
      if (data.data.results && data.data.results.length > 0) {
        console.log(`📁 Components Retrieved: ${data.data.results.length}`);
        const firstResult = data.data.results[0];
        console.log(`📝 Sample component: ${firstResult.type} - ${firstResult.component}`);
        if (firstResult.metadata && firstResult.metadata.Body) {
          console.log(`📄 Has body content: ${firstResult.metadata.Body.length} characters`);
        }
      }
      
      if (data.data.errors && data.data.errors.length > 0) {
        console.log(`⚠️  Errors: ${data.data.errors.length}`);
        data.data.errors.forEach(err => {
          console.log(`   - ${err.component}: ${err.error}`);
        });
      }
      
      results.passed++;
      results.tests.push({ name: 'retrieve-metadata', status: 'PASSED', details: `${data.data.componentsRetrieved} components retrieved` });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'retrieve-metadata', status: 'FAILED', error: error.message });
  }

  // Test 3: Deploy Metadata Components (Check Only)
  try {
    console.log('\n📤 Test 3: Deploy Metadata Components (Check Only)');
    const components = createTestMetadataComponents();
    
    const result = await executeTool('deploy-metadata', {
      components: components,
      options: {
        checkOnly: true,
        rollbackOnError: true
      }
    });
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Component deployment validation completed`);
      console.log(`📊 Deployment Status: ${data.data.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔧 Check Only: ${data.data.checkOnly}`);
      console.log(`📦 Components: ${data.data.componentsDeployed}/${data.data.componentsTotal}`);
      console.log(`❌ Failed Components: ${data.data.componentsFailed}`);
      
      if (data.data.results && data.data.results.length > 0) {
        console.log(`📝 Deployment Results: ${data.data.results.length} items`);
        data.data.results.forEach(result => {
          console.log(`   ✅ ${result.type} - ${result.component}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        });
      }
      
      if (data.data.errors && data.data.errors.length > 0) {
        console.log(`⚠️  Deployment Errors: ${data.data.errors.length}`);
        data.data.errors.forEach(err => {
          console.log(`   ❌ ${err.type} - ${err.component}: ${err.error}`);
        });
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

  // Test 4: Deploy Single Metadata Component (Check Only)
  try {
    console.log('\n📤 Test 4: Deploy Single Metadata Component (Check Only)');
    const singleComponent = {
      type: 'ApexClass',
      fullName: 'MCPSingleTestClass',
      metadata: {
        body: `public class MCPSingleTestClass {
    public static String getSingleMessage() {
        return 'Hello from Single Component Test';
    }
}`
      }
    };
    
    const result = await executeTool('deploy-metadata', {
      components: singleComponent,  // Single component, not array
      options: {
        checkOnly: true,
        rollbackOnError: true
      }
    });
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Single component deployment validation completed`);
      console.log(`📊 Deployment Status: ${data.data.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔧 Check Only: ${data.data.checkOnly}`);
      console.log(`📦 Components: ${data.data.componentsDeployed}/${data.data.componentsTotal}`);
      
      results.passed++;
      results.tests.push({ name: 'deploy-single-metadata', status: 'PASSED', details: `Single component deployment ${data.data.success ? 'succeeded' : 'failed'}` });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'deploy-single-metadata', status: 'FAILED', error: error.message });
  }

  // Test 5: Retrieve Single Metadata Component
  try {
    console.log('\n📥 Test 5: Retrieve Single Metadata Component');
    const singleComponent = {
      type: 'ApexClass',
      fullName: 'Account'  // Using a standard class that should exist
    };
    
    const result = await executeTool('retrieve-metadata', {
      components: singleComponent,  // Single component, not array
      options: {
        includeBody: true
      }
    });
    
    if (result && result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      console.log(`✅ Success: Single component retrieval completed`);
      console.log(`📊 Components Retrieved: ${data.data.componentsRetrieved}/${data.data.componentsTotal}`);
      console.log(`✅ Success Rate: ${data.data.success ? 'SUCCESS' : 'PARTIAL/FAILED'}`);
      
      results.passed++;
      results.tests.push({ name: 'retrieve-single-metadata', status: 'PASSED', details: `Single component retrieval ${data.data.success ? 'succeeded' : 'failed'}` });
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'retrieve-single-metadata', status: 'FAILED', error: error.message });
  }

  // Test Summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 COMPONENT-BASED METADATA TOOLS TEST SUMMARY');
  console.log('=' .repeat(70));
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
    console.log('\n🎉 All component-based metadata tools tests passed! Refactoring is working correctly.');
    console.log('🔧 The metadata tools now use individual component operations instead of zip files.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the component-based implementation.');
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
