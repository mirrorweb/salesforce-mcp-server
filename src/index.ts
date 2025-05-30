#!/usr/bin/env node

/**
 * Salesforce MCP Server
 * 
 * A comprehensive Model Context Protocol server for Salesforce integration.
 * Provides tools for SOQL/SOSL queries, Apex execution, CRUD operations,
 * and metadata management using jsforce.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateConfig } from "./config/environment.js";
import { ConnectionManager } from "./utils/connection.js";
import { SalesforceErrorHandler } from "./utils/errors.js";
import { QueryTools } from "./tools/queryTools.js";
import { ApexTools } from "./tools/apexTools.js";
import { DataTools } from "./tools/dataTools.js";

/**
 * Create the Salesforce MCP server with comprehensive Salesforce capabilities
 */
const server = new Server(
  {
    name: "salesforce-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler that lists available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "test-connection",
        description: "Test Salesforce connection and return organization info",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "execute-soql",
        description: "Execute SOQL query with auto-bulk switching for large result sets",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SOQL query to execute"
            },
            useBulk: {
              type: "boolean",
              description: "Force use of bulk API (optional, auto-detected by default)"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "execute-sosl",
        description: "Execute SOSL search with multi-object support",
        inputSchema: {
          type: "object",
          properties: {
            searchQuery: {
              type: "string",
              description: "SOSL search query to execute"
            }
          },
          required: ["searchQuery"]
        }
      },
      {
        name: "describe-sobject",
        description: "Describe SObject metadata with 1-hour caching",
        inputSchema: {
          type: "object",
          properties: {
            sobjectType: {
              type: "string",
              description: "SObject API name (e.g., Account, Contact, Custom__c)"
            },
            useCache: {
              type: "boolean",
              description: "Use cached metadata if available (default: true)"
            }
          },
          required: ["sobjectType"]
        }
      },
      {
        name: "execute-apex",
        description: "Execute anonymous Apex code with debug log capture",
        inputSchema: {
          type: "object",
          properties: {
            apexCode: {
              type: "string",
              description: "Anonymous Apex code to execute"
            },
            captureDebugLogs: {
              type: "boolean",
              description: "Capture debug logs from execution (default: true)"
            }
          },
          required: ["apexCode"]
        }
      },
      {
        name: "run-apex-tests",
        description: "Run Apex tests with coverage and detailed results",
        inputSchema: {
          type: "object",
          properties: {
            testClasses: {
              type: "array",
              items: { type: "string" },
              description: "Specific test classes to run (optional)"
            },
            testMethods: {
              type: "array",
              items: { type: "string" },
              description: "Specific test methods to run in format 'ClassName.methodName' (optional)"
            },
            includeCoverage: {
              type: "boolean",
              description: "Include code coverage information (default: true)"
            }
          },
          required: []
        }
      },
      {
        name: "get-apex-logs",
        description: "Get debug logs with filtering and parsing options",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of logs to retrieve (default: 10)"
            },
            userId: {
              type: "string",
              description: "Filter logs by user ID (optional)"
            },
            startTime: {
              type: "string",
              description: "Filter logs from this start time in ISO format (optional)"
            },
            operation: {
              type: "string",
              description: "Filter logs by operation type (optional)"
            }
          },
          required: []
        }
      },
      {
        name: "create-record",
        description: "Create single or multiple records with auto-bulk switching",
        inputSchema: {
          type: "object",
          properties: {
            sobjectType: {
              type: "string",
              description: "SObject API name (e.g., Account, Contact, Custom__c)"
            },
            recordData: {
              oneOf: [
                { type: "object", description: "Single record data" },
                { type: "array", items: { type: "object" }, description: "Multiple records data" }
              ],
              description: "Record data to create"
            },
            options: {
              type: "object",
              properties: {
                allOrNone: {
                  type: "boolean",
                  description: "All records must succeed or all fail (default: false)"
                }
              }
            }
          },
          required: ["sobjectType", "recordData"]
        }
      },
      {
        name: "get-record",
        description: "Retrieve a record by ID with optional field selection",
        inputSchema: {
          type: "object",
          properties: {
            sobjectType: {
              type: "string",
              description: "SObject API name (e.g., Account, Contact, Custom__c)"
            },
            recordId: {
              type: "string",
              description: "Salesforce record ID"
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description: "Specific fields to retrieve (optional, retrieves all if not specified)"
            }
          },
          required: ["sobjectType", "recordId"]
        }
      },
      {
        name: "update-record",
        description: "Update single or multiple records with auto-bulk switching",
        inputSchema: {
          type: "object",
          properties: {
            sobjectType: {
              type: "string",
              description: "SObject API name (e.g., Account, Contact, Custom__c)"
            },
            recordData: {
              oneOf: [
                { type: "object", description: "Single record data with Id" },
                { type: "array", items: { type: "object" }, description: "Multiple records data with Ids" }
              ],
              description: "Record data to update (must include Id field)"
            },
            options: {
              type: "object",
              properties: {
                allOrNone: {
                  type: "boolean",
                  description: "All records must succeed or all fail (default: false)"
                }
              }
            }
          },
          required: ["sobjectType", "recordData"]
        }
      },
      {
        name: "delete-record",
        description: "Delete records by ID(s) with auto-bulk switching",
        inputSchema: {
          type: "object",
          properties: {
            sobjectType: {
              type: "string",
              description: "SObject API name (e.g., Account, Contact, Custom__c)"
            },
            recordIds: {
              oneOf: [
                { type: "string", description: "Single record ID" },
                { type: "array", items: { type: "string" }, description: "Multiple record IDs" }
              ],
              description: "Record ID(s) to delete"
            },
            options: {
              type: "object",
              properties: {
                allOrNone: {
                  type: "boolean",
                  description: "All records must succeed or all fail (default: false)"
                }
              }
            }
          },
          required: ["sobjectType", "recordIds"]
        }
      },
      {
        name: "upsert-record",
        description: "Upsert records using external ID with auto-bulk switching",
        inputSchema: {
          type: "object",
          properties: {
            sobjectType: {
              type: "string",
              description: "SObject API name (e.g., Account, Contact, Custom__c)"
            },
            externalIdField: {
              type: "string",
              description: "External ID field name for upsert matching"
            },
            recordData: {
              oneOf: [
                { type: "object", description: "Single record data" },
                { type: "array", items: { type: "object" }, description: "Multiple records data" }
              ],
              description: "Record data to upsert"
            },
            options: {
              type: "object",
              properties: {
                allOrNone: {
                  type: "boolean",
                  description: "All records must succeed or all fail (default: false)"
                }
              }
            }
          },
          required: ["sobjectType", "externalIdField", "recordData"]
        }
      }
    ]
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const context = SalesforceErrorHandler.createContext(request.params.name, "tool-execution");
  
  switch (request.params.name) {
    case "test-connection": {
      try {
        console.error('[test-connection] Testing Salesforce connection...');
        
        const conn = await ConnectionManager.getConnection();
        const result = await conn.query('SELECT Id, Name FROM Organization LIMIT 1');
        
        const connectionInfo = ConnectionManager.getConnectionInfo();
        
        const responseData = {
          connected: true,
          organizationId: result.records[0]?.Id,
          organizationName: result.records[0]?.Name,
          instanceUrl: conn.instanceUrl,
          apiVersion: conn.version,
          connectionInfo
        };
        
        console.error('[test-connection] Connection test successful');
        return SalesforceErrorHandler.formatSuccess(responseData, context);
        
      } catch (error) {
        console.error('[test-connection] Connection test failed:', error);
        return SalesforceErrorHandler.formatError(error, context);
      }
    }
    
    case "execute-soql": {
      const args = request.params.arguments as { query: string; useBulk?: boolean };
      return await QueryTools.executeSoql(args.query, args.useBulk);
    }
    
    case "execute-sosl": {
      const args = request.params.arguments as { searchQuery: string };
      return await QueryTools.executeSosl(args.searchQuery);
    }
    
    case "describe-sobject": {
      const args = request.params.arguments as { sobjectType: string; useCache?: boolean };
      return await QueryTools.describeSObject(args.sobjectType, args.useCache);
    }
    
    case "execute-apex": {
      const args = request.params.arguments as { apexCode: string; captureDebugLogs?: boolean };
      return await ApexTools.executeApex(args.apexCode, args.captureDebugLogs);
    }
    
    case "run-apex-tests": {
      const args = request.params.arguments as { testClasses?: string[]; testMethods?: string[]; includeCoverage?: boolean };
      return await ApexTools.runApexTests(args.testClasses, args.testMethods, args.includeCoverage);
    }
    
    case "get-apex-logs": {
      const args = request.params.arguments as { limit?: number; userId?: string; startTime?: string; operation?: string };
      return await ApexTools.getApexLogs(args.limit, args.userId, args.startTime, args.operation);
    }
    
    case "create-record": {
      const args = request.params.arguments as { sobjectType: string; recordData: any; options?: { allOrNone?: boolean } };
      return await DataTools.createRecord(args.sobjectType, args.recordData, args.options);
    }
    
    case "get-record": {
      const args = request.params.arguments as { sobjectType: string; recordId: string; fields?: string[] };
      return await DataTools.getRecord(args.sobjectType, args.recordId, args.fields);
    }
    
    case "update-record": {
      const args = request.params.arguments as { sobjectType: string; recordData: any; options?: { allOrNone?: boolean } };
      return await DataTools.updateRecord(args.sobjectType, args.recordData, args.options);
    }
    
    case "delete-record": {
      const args = request.params.arguments as { sobjectType: string; recordIds: string | string[]; options?: { allOrNone?: boolean } };
      return await DataTools.deleteRecord(args.sobjectType, args.recordIds, args.options);
    }
    
    case "upsert-record": {
      const args = request.params.arguments as { sobjectType: string; externalIdField: string; recordData: any; options?: { allOrNone?: boolean } };
      return await DataTools.upsertRecord(args.sobjectType, args.externalIdField, args.recordData, args.options);
    }
    
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

/**
 * Start the server using stdio transport
 */
async function main() {
  try {
    console.error('[Salesforce MCP Server] Starting server...');
    
    // Validate configuration
    validateConfig();
    
    // Set up transport
    const transport = new StdioServerTransport();
    
    // Connect server
    await server.connect(transport);
    
    console.error('[Salesforce MCP Server] Server started successfully');
    console.error('[Salesforce MCP Server] Available tools: test-connection, execute-soql, execute-sosl, describe-sobject, execute-apex, run-apex-tests, get-apex-logs, create-record, get-record, update-record, delete-record, upsert-record');
    
  } catch (error) {
    console.error('[Salesforce MCP Server] Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('[Salesforce MCP Server] Shutting down...');
  await ConnectionManager.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[Salesforce MCP Server] Shutting down...');
  await ConnectionManager.closeConnection();
  process.exit(0);
});

main().catch((error) => {
  console.error('[Salesforce MCP Server] Unhandled error:', error);
  process.exit(1);
});
