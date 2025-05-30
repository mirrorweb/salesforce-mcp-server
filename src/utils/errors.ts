export interface SalesforceErrorContext {
  toolName: string;
  operation?: string;
  timestamp: string;
}

export interface MCPErrorResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError: true;
}

export interface MCPSuccessResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: false;
}

export type MCPResponse = MCPErrorResponse | MCPSuccessResponse;

export class SalesforceErrorHandler {
  static formatError(error: any, context: SalesforceErrorContext): MCPErrorResponse {
    const errorInfo = {
      success: false,
      salesforceError: {
        message: error.message || 'Unknown error',
        errorCode: error.errorCode || error.name || 'UNKNOWN_ERROR',
        fields: error.fields || [],
        statusCode: error.statusCode
      },
      context: {
        tool: context.toolName,
        operation: context.operation,
        timestamp: context.timestamp
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(errorInfo, null, 2)
      }],
      isError: true
    };
  }

  static formatSuccess(data: any, context?: Partial<SalesforceErrorContext>): MCPSuccessResponse {
    const result = {
      success: true,
      data,
      ...(context && {
        context: {
          tool: context.toolName,
          operation: context.operation,
          timestamp: context.timestamp || new Date().toISOString()
        }
      })
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  static createContext(toolName: string, operation?: string): SalesforceErrorContext {
    return {
      toolName,
      operation,
      timestamp: new Date().toISOString()
    };
  }
}
