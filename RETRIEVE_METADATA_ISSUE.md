# Retrieve Metadata Tool - Known Issue

## Status: DISABLED ⚠️

The `retrieve-metadata` tool has been temporarily disabled due to jsforce API compatibility issues.

## Issue Description

The jsforce library's `metadata.retrieve()` method has limitations with types-based retrieval that cause the following error:

```
Element {http://soap.sforce.com/2006/04/metadata}types invalid at this location
```

## Root Cause

The jsforce library expects a different API format for metadata retrieval than what the Salesforce Metadata API documentation suggests. The `types` property structure is not compatible with jsforce's implementation.

## Current Implementation

The tool now returns a clear error message explaining the issue and suggesting workarounds:

```
⚠️ KNOWN ISSUE: The retrieve-metadata tool is currently disabled due to jsforce API compatibility issues.

The jsforce library's metadata.retrieve() method has limitations with types-based retrieval that cause API format errors.

Workarounds:
1. Use deploy-metadata with package.xml files instead
2. Use Salesforce CLI or other tools for metadata retrieval
3. Wait for future updates that will implement direct Salesforce Metadata API calls

This will be resolved in a future version of the MCP server.
```

## Working Tools

- ✅ **list-metadata-types**: Fully functional (discovers 223+ metadata types)
- ✅ **deploy-metadata**: Fully functional (supports check-only and full deployments)
- ❌ **retrieve-metadata**: Disabled with clear error message

## Future Resolution Options

1. **Package.xml Approach**: Implement a workflow where users deploy package.xml files first, then retrieve by package name
2. **Direct API Calls**: Bypass jsforce and implement direct Salesforce Metadata API calls using SOAP
3. **jsforce Updates**: Wait for jsforce library updates that fix the API compatibility
4. **Alternative Libraries**: Consider using other Salesforce libraries that have better metadata API support

## Impact

- Users can still deploy metadata using `deploy-metadata`
- Users can discover available metadata types using `list-metadata-types`
- Users need to use external tools (Salesforce CLI, VS Code extensions) for metadata retrieval
- The MCP server remains fully functional for all other Salesforce operations

## Test Results

```
📊 METADATA TOOLS TEST SUMMARY
✅ Passed: 2/3 tools (66.7% success rate)
❌ Failed: 1/3 tools (retrieve-metadata - expected failure)

Working tools provide comprehensive metadata deployment and discovery capabilities.
```

This issue will be addressed in a future version of the Salesforce MCP Server.
