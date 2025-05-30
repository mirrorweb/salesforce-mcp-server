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
    console.error('[Salesforce MCP Server] Available tools: test-connection');
    
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
