#!/usr/bin/env node

/**
 * Test script for Salesforce MCP Server Data Management Tools
 * Tests all CRUD operations: create, get, update, delete, upsert
 */

const { spawn } = require('child_process');

// Test data for creating records
const testAccountData = {
  Name: 'Test Account from MCP Data Tools',
  Type: 'Customer',
  Industry: 'Technology'
};

const testContactData = {
  FirstName: 'John',
  LastName: 'Doe MCP Test',
  Email: 'john.doe.mcp@example.com'
};

async function testMCPTool(toolName, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing ${toolName}...`);
    console.log(`📤 Input:`, JSON.stringify(args, null, 2));
    
    const child = spawn('node', ['./build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
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
      if (code === 0) {
        try {
          const response = JSON.parse(stdout);
          console.log(`✅ ${toolName} succeeded`);
          console.log(`📥 Output:`, JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.log(`❌ ${toolName} failed - Invalid JSON response`);
          console.log('Raw stdout:', stdout);
          console.log('Raw stderr:', stderr);
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      } else {
        console.log(`❌ ${toolName} failed with exit code ${code}`);
        console.log('Stderr:', stderr);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    // Send the MCP request
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
  });
}

async function runDataToolsTests() {
  console.log('🚀 Starting Salesforce MCP Server Data Management Tools Tests');
  console.log('=' .repeat(60));
  
  let createdAccountId = null;
  let createdContactId = null;
  
  try {
    // Test 1: Create a single Account record
    console.log('\n📝 Test 1: Create Single Account Record');
    const createAccountResult = await testMCPTool('create-record', {
      sobjectType: 'Account',
      recordData: testAccountData
    });
    
    if (createAccountResult.content?.[0]?.text) {
      const parsedResult = JSON.parse(createAccountResult.content[0].text);
      if (parsedResult.success && parsedResult.data?.results?.id) {
        createdAccountId = parsedResult.data.results.id;
        console.log(`✅ Account created with ID: ${createdAccountId}`);
      }
    }
    
    // Test 2: Create a single Contact record
    console.log('\n📝 Test 2: Create Single Contact Record');
    const createContactResult = await testMCPTool('create-record', {
      sobjectType: 'Contact',
      recordData: {
        ...testContactData,
        AccountId: createdAccountId // Link to the account we just created
      }
    });
    
    if (createContactResult.content?.[0]?.text) {
      const parsedResult = JSON.parse(createContactResult.content[0].text);
      if (parsedResult.success && parsedResult.data?.results?.id) {
        createdContactId = parsedResult.data.results.id;
        console.log(`✅ Contact created with ID: ${createdContactId}`);
      }
    }
    
    // Test 3: Get the Account record (all fields)
    if (createdAccountId) {
      console.log('\n📝 Test 3: Get Account Record (All Fields)');
      await testMCPTool('get-record', {
        sobjectType: 'Account',
        recordId: createdAccountId
      });
    }
    
    // Test 4: Get the Account record (specific fields)
    if (createdAccountId) {
      console.log('\n📝 Test 4: Get Account Record (Specific Fields)');
      await testMCPTool('get-record', {
        sobjectType: 'Account',
        recordId: createdAccountId,
        fields: ['Id', 'Name', 'Type', 'Industry', 'CreatedDate']
      });
    }
    
    // Test 5: Update the Account record
    if (createdAccountId) {
      console.log('\n📝 Test 5: Update Account Record');
      await testMCPTool('update-record', {
        sobjectType: 'Account',
        recordData: {
          Id: createdAccountId,
          Name: 'Updated Test Account from MCP Data Tools',
          Description: 'This account was updated via MCP Data Tools'
        }
      });
    }
    
    // Test 6: Create multiple records
    console.log('\n📝 Test 6: Create Multiple Account Records');
    const multipleAccountsResult = await testMCPTool('create-record', {
      sobjectType: 'Account',
      recordData: [
        { Name: 'Bulk Account 1 MCP', Type: 'Customer' },
        { Name: 'Bulk Account 2 MCP', Type: 'Partner' },
        { Name: 'Bulk Account 3 MCP', Type: 'Prospect' }
      ]
    });
    
    let bulkAccountIds = [];
    if (multipleAccountsResult.content?.[0]?.text) {
      const parsedResult = JSON.parse(multipleAccountsResult.content[0].text);
      if (parsedResult.success && parsedResult.data?.results) {
        bulkAccountIds = parsedResult.data.results.map(r => r.id);
        console.log(`✅ Created ${bulkAccountIds.length} accounts in bulk`);
      }
    }
    
    // Test 7: Update multiple records
    if (bulkAccountIds.length > 0) {
      console.log('\n📝 Test 7: Update Multiple Account Records');
      await testMCPTool('update-record', {
        sobjectType: 'Account',
        recordData: bulkAccountIds.map((id, index) => ({
          Id: id,
          Description: `Bulk updated account #${index + 1} via MCP Data Tools`
        }))
      });
    }
    
    // Test 8: Test upsert with external ID (using Name as external ID for demo)
    console.log('\n📝 Test 8: Upsert Record Using External ID');
    await testMCPTool('upsert-record', {
      sobjectType: 'Account',
      externalIdField: 'Name',
      recordData: {
        Name: 'Upsert Test Account MCP',
        Type: 'Customer',
        Industry: 'Manufacturing',
        Description: 'This account was upserted via MCP Data Tools'
      }
    });
    
    // Test 9: Delete the Contact record
    if (createdContactId) {
      console.log('\n📝 Test 9: Delete Single Contact Record');
      await testMCPTool('delete-record', {
        sobjectType: 'Contact',
        recordIds: createdContactId
      });
    }
    
    // Test 10: Delete multiple Account records
    const allAccountIds = [createdAccountId, ...bulkAccountIds].filter(Boolean);
    if (allAccountIds.length > 0) {
      console.log('\n📝 Test 10: Delete Multiple Account Records');
      await testMCPTool('delete-record', {
        sobjectType: 'Account',
        recordIds: allAccountIds
      });
    }
    
    console.log('\n🎉 All Data Management Tools tests completed successfully!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('=' .repeat(60));
    process.exit(1);
  }
}

// Run the tests
runDataToolsTests().catch(console.error);
