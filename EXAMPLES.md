# Salesforce MCP Server - Examples & Usage Guide

This document provides comprehensive examples of all 17 tools available in the Salesforce MCP Server, organized by category with practical use cases.

## 🔗 Connection Tools

### test-connection
Test your Salesforce connection and get organization information.

```json
{
  "tool": "test-connection",
  "arguments": {}
}
```

**Example Response:**
```json
{
  "connected": true,
  "organizationId": "00D4K0000064NXtUAM",
  "organizationName": "Mirrorweb",
  "instanceUrl": "https://mirror-web.my.salesforce.com",
  "apiVersion": "59.0",
  "connectionInfo": {
    "strategy": "OAuth2",
    "lastConnected": "2025-01-29T03:01:13.701Z"
  }
}
```

---

## 🔍 Query & Search Tools

### execute-soql
Execute SOQL queries with automatic bulk API switching for large datasets.

**Basic Query:**
```json
{
  "tool": "execute-soql",
  "arguments": {
    "query": "SELECT Id, Name, Email FROM Contact LIMIT 10"
  }
}
```

**Complex Query with Relationships:**
```json
{
  "tool": "execute-soql",
  "arguments": {
    "query": "SELECT Id, Name, Account.Name, Account.Industry, CreatedDate FROM Contact WHERE Account.Industry = 'Technology' ORDER BY CreatedDate DESC"
  }
}
```

**Force Bulk API Usage:**
```json
{
  "tool": "execute-soql",
  "arguments": {
    "query": "SELECT Id, Name, Email FROM Contact",
    "useBulk": true
  }
}
```

**Custom Object Query:**
```json
{
  "tool": "execute-soql",
  "arguments": {
    "query": "SELECT Id, Name, Custom_Field__c FROM Custom_Object__c WHERE Status__c = 'Active'"
  }
}
```

### execute-sosl
Execute SOSL search queries across multiple objects.

**Basic Search:**
```json
{
  "tool": "execute-sosl",
  "arguments": {
    "searchQuery": "FIND {John} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email)"
  }
}
```

**Advanced Search with Filters:**
```json
{
  "tool": "execute-sosl",
  "arguments": {
    "searchQuery": "FIND {test*} IN ALL FIELDS RETURNING Account(Id, Name WHERE Industry = 'Technology'), Contact(Id, Name, Email WHERE CreatedDate = LAST_WEEK) LIMIT 20"
  }
}
```

**Email Search:**
```json
{
  "tool": "execute-sosl",
  "arguments": {
    "searchQuery": "FIND {@company.com} IN EMAIL FIELDS RETURNING Contact(Id, Name, Email), Lead(Id, Name, Email)"
  }
}
```

### describe-sobject
Get detailed metadata about Salesforce objects.

**Standard Object:**
```json
{
  "tool": "describe-sobject",
  "arguments": {
    "sobjectType": "Account"
  }
}
```

**Custom Object:**
```json
{
  "tool": "describe-sobject",
  "arguments": {
    "sobjectType": "Custom_Object__c"
  }
}
```

**Bypass Cache:**
```json
{
  "tool": "describe-sobject",
  "arguments": {
    "sobjectType": "Contact",
    "useCache": false
  }
}
```

---

## ⚡ Apex Development Tools

### execute-apex
Execute anonymous Apex code with debug log capture.

**Simple Apex Execution:**
```json
{
  "tool": "execute-apex",
  "arguments": {
    "apexCode": "System.debug('Hello World'); Integer result = 5 + 3; System.debug('Result: ' + result);"
  }
}
```

**SOQL in Apex:**
```json
{
  "tool": "execute-apex",
  "arguments": {
    "apexCode": "List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 5]; for(Account acc : accounts) { System.debug('Account: ' + acc.Name); }"
  }
}
```

**DML Operations:**
```json
{
  "tool": "execute-apex",
  "arguments": {
    "apexCode": "Account newAccount = new Account(Name = 'Test Account', Industry = 'Technology'); insert newAccount; System.debug('Created Account ID: ' + newAccount.Id);"
  }
}
```

**Without Debug Logs:**
```json
{
  "tool": "execute-apex",
  "arguments": {
    "apexCode": "System.debug('This will not capture logs');",
    "captureDebugLogs": false
  }
}
```

### run-apex-tests
Execute Apex tests with coverage reporting.

**Run All Tests:**
```json
{
  "tool": "run-apex-tests",
  "arguments": {}
}
```

**Run Specific Test Classes:**
```json
{
  "tool": "run-apex-tests",
  "arguments": {
    "testClasses": ["AccountTriggerTest", "ContactTriggerTest"]
  }
}
```

**Run Specific Test Methods:**
```json
{
  "tool": "run-apex-tests",
  "arguments": {
    "testMethods": ["AccountTriggerTest.testAccountCreation", "ContactTriggerTest.testContactValidation"]
  }
}
```

**Run Tests Without Coverage:**
```json
{
  "tool": "run-apex-tests",
  "arguments": {
    "testClasses": ["MyTestClass"],
    "includeCoverage": false
  }
}
```

### get-apex-logs
Retrieve and filter debug logs.

**Get Latest Logs:**
```json
{
  "tool": "get-apex-logs",
  "arguments": {
    "limit": 5
  }
}
```

**Filter by User:**
```json
{
  "tool": "get-apex-logs",
  "arguments": {
    "userId": "0054K000003uBg1QAE",
    "limit": 10
  }
}
```

**Filter by Time Range:**
```json
{
  "tool": "get-apex-logs",
  "arguments": {
    "startTime": "2025-01-29T00:00:00Z",
    "limit": 20
  }
}
```

**Filter by Operation:**
```json
{
  "tool": "get-apex-logs",
  "arguments": {
    "operation": "Anonymous Apex",
    "limit": 15
  }
}
```

---

## 📊 Data Management Tools

### create-record
Create single or multiple records with automatic bulk API switching.

**Single Record:**
```json
{
  "tool": "create-record",
  "arguments": {
    "sobjectType": "Account",
    "recordData": {
      "Name": "New Account",
      "Industry": "Technology",
      "Phone": "555-0123"
    }
  }
}
```

**Multiple Records:**
```json
{
  "tool": "create-record",
  "arguments": {
    "sobjectType": "Contact",
    "recordData": [
      {
        "FirstName": "John",
        "LastName": "Doe",
        "Email": "john.doe@example.com"
      },
      {
        "FirstName": "Jane",
        "LastName": "Smith",
        "Email": "jane.smith@example.com"
      }
    ]
  }
}
```

**All-or-None Operation:**
```json
{
  "tool": "create-record",
  "arguments": {
    "sobjectType": "Account",
    "recordData": [
      {"Name": "Account 1"},
      {"Name": "Account 2"}
    ],
    "options": {
      "allOrNone": true
    }
  }
}
```

### get-record
Retrieve records by ID with optional field selection.

**Get All Fields:**
```json
{
  "tool": "get-record",
  "arguments": {
    "sobjectType": "Account",
    "recordId": "001P300000LSpYHIA1"
  }
}
```

**Get Specific Fields:**
```json
{
  "tool": "get-record",
  "arguments": {
    "sobjectType": "Contact",
    "recordId": "003P300000LSpYHIA1",
    "fields": ["Id", "Name", "Email", "Phone", "Account.Name"]
  }
}
```

### update-record
Update single or multiple records.

**Single Record Update:**
```json
{
  "tool": "update-record",
  "arguments": {
    "sobjectType": "Account",
    "recordData": {
      "Id": "001P300000LSpYHIA1",
      "Name": "Updated Account Name",
      "Industry": "Healthcare"
    }
  }
}
```

**Multiple Records Update:**
```json
{
  "tool": "update-record",
  "arguments": {
    "sobjectType": "Contact",
    "recordData": [
      {
        "Id": "003P300000LSpYHIA1",
        "Email": "new.email@example.com"
      },
      {
        "Id": "003P300000LSpYHIB2",
        "Phone": "555-9999"
      }
    ]
  }
}
```

### delete-record
Delete records by ID(s).

**Delete Single Record:**
```json
{
  "tool": "delete-record",
  "arguments": {
    "sobjectType": "Account",
    "recordIds": "001P300000LSpYHIA1"
  }
}
```

**Delete Multiple Records:**
```json
{
  "tool": "delete-record",
  "arguments": {
    "sobjectType": "Contact",
    "recordIds": ["003P300000LSpYHIA1", "003P300000LSpYHIB2"]
  }
}
```

**All-or-None Delete:**
```json
{
  "tool": "delete-record",
  "arguments": {
    "sobjectType": "Custom_Object__c",
    "recordIds": ["a01P300000001", "a01P300000002"],
    "options": {
      "allOrNone": true
    }
  }
}
```

### upsert-record
Insert or update records using external ID fields.

**Single Record Upsert:**
```json
{
  "tool": "upsert-record",
  "arguments": {
    "sobjectType": "Account",
    "externalIdField": "External_ID__c",
    "recordData": {
      "External_ID__c": "EXT001",
      "Name": "Upserted Account",
      "Industry": "Finance"
    }
  }
}
```

**Multiple Records Upsert:**
```json
{
  "tool": "upsert-record",
  "arguments": {
    "sobjectType": "Contact",
    "externalIdField": "Employee_ID__c",
    "recordData": [
      {
        "Employee_ID__c": "EMP001",
        "FirstName": "John",
        "LastName": "Doe",
        "Email": "john.doe@company.com"
      },
      {
        "Employee_ID__c": "EMP002",
        "FirstName": "Jane",
        "LastName": "Smith",
        "Email": "jane.smith@company.com"
      }
    ]
  }
}
```

---

## 🔧 Metadata Tools

### list-metadata-types
Discover available metadata types in your org.

**List All Types:**
```json
{
  "tool": "list-metadata-types",
  "arguments": {}
}
```

**Specify API Version:**
```json
{
  "tool": "list-metadata-types",
  "arguments": {
    "apiVersion": "59.0"
  }
}
```

### deploy-metadata
Deploy metadata components to your org.

**Deploy Apex Class from JSON:**
```json
{
  "tool": "deploy-metadata",
  "arguments": {
    "components": {
      "type": "ApexClass",
      "fullName": "MyUtilityClass",
      "metadata": {
        "body": "public class MyUtilityClass {\n    public static String getHelloWorld() {\n        return 'Hello World';\n    }\n}",
        "status": "Active"
      }
    }
  }
}
```

**Deploy Multiple Components:**
```json
{
  "tool": "deploy-metadata",
  "arguments": {
    "components": [
      {
        "type": "ApexClass",
        "fullName": "TestClass1",
        "metadata": {
          "body": "public class TestClass1 { }",
          "status": "Active"
        }
      },
      {
        "type": "ApexClass",
        "fullName": "TestClass2",
        "metadata": {
          "body": "public class TestClass2 { }",
          "status": "Active"
        }
      }
    ]
  }
}
```

**Deploy from Files:**
```json
{
  "tool": "deploy-metadata",
  "arguments": {
    "components": {
      "filePaths": [
        "tests/test-files/classes/HelloWorld.cls"
      ]
    }
  }
}
```

**Validation Only (Check Only):**
```json
{
  "tool": "deploy-metadata",
  "arguments": {
    "components": {
      "type": "ApexClass",
      "fullName": "ValidationTest",
      "metadata": {
        "body": "public class ValidationTest { }",
        "status": "Active"
      }
    },
    "options": {
      "checkOnly": true,
      "rollbackOnError": true
    }
  }
}
```

### deploy-bundle
Deploy metadata bundles (e.g., Lightning Web Components) from directories.

**Deploy LWC Bundle:**
```json
{
  "tool": "deploy-bundle",
  "arguments": {
    "bundlePath": "tests/test-files/force-app/main/default/lwc/helloWorld"
  }
}
```

**Deploy with Options:**
```json
{
  "tool": "deploy-bundle",
  "arguments": {
    "bundlePath": "path/to/lwc/component",
    "options": {
      "checkOnly": false,
      "rollbackOnError": true,
      "runTests": ["MyComponentTest"]
    }
  }
}
```

### retrieve-metadata
Retrieve metadata components from your org.

**Retrieve Single Component:**
```json
{
  "tool": "retrieve-metadata",
  "arguments": {
    "components": {
      "type": "ApexClass",
      "fullName": "AccountTriggerHandler"
    }
  }
}
```

**Retrieve Multiple Components:**
```json
{
  "tool": "retrieve-metadata",
  "arguments": {
    "components": [
      {
        "type": "ApexClass",
        "fullName": "AccountTriggerHandler"
      },
      {
        "type": "ApexTrigger",
        "fullName": "AccountTrigger"
      }
    ]
  }
}
```

**Retrieve Without Body:**
```json
{
  "tool": "retrieve-metadata",
  "arguments": {
    "components": {
      "type": "CustomObject",
      "fullName": "Custom_Object__c"
    },
    "options": {
      "includeBody": false,
      "apiVersion": "59.0"
    }
  }
}
```

### check-deploy-status
Monitor deployment progress and results.

**Check Deployment Status:**
```json
{
  "tool": "check-deploy-status",
  "arguments": {
    "deployId": "0Af4K00000ABC123"
  }
}
```

---

## 🔄 Advanced Workflows

### Data Migration Example
Complete workflow for migrating data:

1. **Extract data:**
```json
{
  "tool": "execute-soql",
  "arguments": {
    "query": "SELECT Id, Name, Email, Phone FROM Contact WHERE Account.Name = 'Migration Source'"
  }
}
```

2. **Transform and create in target:**
```json
{
  "tool": "create-record",
  "arguments": {
    "sobjectType": "Contact",
    "recordData": [
      {
        "FirstName": "Transformed",
        "LastName": "Contact1",
        "Email": "contact1@target.com"
      }
    ]
  }
}
```

### Testing Workflow
Complete testing cycle:

1. **Deploy test class:**
```json
{
  "tool": "deploy-metadata",
  "arguments": {
    "components": {
      "type": "ApexClass",
      "fullName": "MyTestClass",
      "metadata": {
        "body": "@isTest public class MyTestClass { @isTest static void testMethod() { System.assert(true); } }",
        "status": "Active"
      }
    }
  }
}
```

2. **Run tests:**
```json
{
  "tool": "run-apex-tests",
  "arguments": {
    "testClasses": ["MyTestClass"]
  }
}
```

3. **Check logs:**
```json
{
  "tool": "get-apex-logs",
  "arguments": {
    "operation": "Test",
    "limit": 5
  }
}
```

---

## 🛡️ Best Practices

### Error Handling
All tools return standardized responses with error details:

```json
{
  "success": false,
  "error": "INVALID_FIELD",
  "message": "No such column 'InvalidField' on entity 'Account'",
  "details": {
    "context": "execute-soql",
    "timestamp": "2025-01-29T10:30:00Z"
  }
}
```

### Performance Tips

1. **Use bulk operations** for large datasets (auto-switched at 200+ records for DML, 2000+ for queries)
2. **Specify fields** in get-record to reduce payload size
3. **Use caching** for describe-sobject (enabled by default with 1-hour TTL)
4. **Batch deployments** for multiple metadata components

### Security Considerations

1. **Safe for auto-approval:** test-connection, execute-soql, describe-sobject, get-record, get-apex-logs, list-metadata-types
2. **Require manual approval:** All DML operations, deployments, execute-apex, run-apex-tests
3. **Environment variables** keep credentials secure and out of MCP configs

---

## 📞 Support & Documentation

- **Repository:** https://github.com/jaworjar95/salesforce-mcp-server
- **Issues:** Report bugs and feature requests via GitHub Issues
- **API Reference:** See README.md for detailed API documentation
- **Salesforce API Docs:** https://developer.salesforce.com/docs/

---

*This MCP server provides comprehensive Salesforce integration for AI development tools. All tools support both single and bulk operations where applicable, with intelligent auto-switching for optimal performance.* 