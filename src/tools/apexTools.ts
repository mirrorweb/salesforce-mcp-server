/**
 * Apex Development Tools for Salesforce MCP Server
 * 
 * Provides tools for Apex code execution, testing, and debug log management.
 * Includes anonymous Apex execution, test running with coverage, and log retrieval.
 */

import { Connection } from 'jsforce';
import { ConnectionManager } from '../utils/connection.js';
import { SalesforceErrorHandler } from '../utils/errors.js';

/**
 * Interface for Apex execution result
 */
interface ApexExecutionResult {
  success: boolean;
  compiled: boolean;
  compileProblem?: string;
  exceptionMessage?: string;
  exceptionStackTrace?: string;
  line?: number;
  column?: number;
  logs?: string[];
}

/**
 * Interface for Apex test result
 */
interface ApexTestResult {
  success: boolean;
  totalTests: number;
  testsRan: number;
  failures: number;
  successes: number;
  coverage?: {
    totalLines: number;
    coveredLines: number;
    coveragePercentage: number;
  };
  testResults: Array<{
    id: string;
    queueItemId: string;
    stackTrace?: string;
    message?: string;
    asyncApexJobId: string;
    methodName: string;
    outcome: string;
    apexClass: {
      id: string;
      name: string;
      namespacePrefix?: string;
    };
    runTime?: number;
  }>;
  codeCoverage?: Array<{
    id: string;
    name: string;
    type: string;
    numLocations: number;
    numLocationsNotCovered: number;
    coveragePercentage: number;
  }>;
}

/**
 * Interface for debug log entry
 */
interface DebugLogEntry {
  id: string;
  logUserId: string;
  logLength: number;
  lastModifiedDate: string;
  request: string;
  operation: string;
  application: string;
  status: string;
  durationMilliseconds: number;
  startTime: string;
  location: string;
}

/**
 * Apex Development Tools class providing static methods for Apex operations
 */
export class ApexTools {
  
  /**
   * Execute anonymous Apex code with debug log capture
   */
  static async executeApex(apexCode: string, captureDebugLogs: boolean = true): Promise<any> {
    const context = SalesforceErrorHandler.createContext('execute-apex', 'apex-execution');
    
    try {
      console.error('[execute-apex] Executing anonymous Apex code...');
      
      const conn = await ConnectionManager.getConnection();
      
      // Enable debug logging if requested
      if (captureDebugLogs) {
        await this.enableDebugLogging(conn);
      }
      
      // Execute anonymous Apex
      const result = await conn.tooling.executeAnonymous(apexCode);
      
      console.error('[execute-apex] Apex execution completed, success:', result.success);
      
      let logs: string[] = [];
      
      // Capture debug logs if requested and execution was successful
      if (captureDebugLogs) {
        try {
          logs = await this.getRecentDebugLogs(conn, 1);
        } catch (logError) {
          console.error('[execute-apex] Warning: Could not retrieve debug logs:', logError);
        }
      }
      
      const executionResult: ApexExecutionResult = {
        success: result.success,
        compiled: result.compiled,
        compileProblem: result.compileProblem || undefined,
        exceptionMessage: result.exceptionMessage || undefined,
        exceptionStackTrace: result.exceptionStackTrace || undefined,
        line: result.line || undefined,
        column: result.column || undefined,
        logs: logs
      };
      
      return SalesforceErrorHandler.formatSuccess(executionResult, context);
      
    } catch (error) {
      console.error('[execute-apex] Apex execution failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Run Apex tests with coverage and detailed results
   */
  static async runApexTests(
    testClasses?: string[], 
    testMethods?: string[], 
    includeCoverage: boolean = true
  ): Promise<any> {
    const context = SalesforceErrorHandler.createContext('run-apex-tests', 'test-execution');
    
    try {
      console.error('[run-apex-tests] Starting Apex test execution...');
      
      const conn = await ConnectionManager.getConnection();
      
      // Build test run request
      const testRequest: any = {
        tests: []
      };
      
      // Add specific test classes if provided
      if (testClasses && testClasses.length > 0) {
        for (const className of testClasses) {
          testRequest.tests.push({
            classId: await this.getApexClassId(conn, className)
          });
        }
      }
      
      // Add specific test methods if provided
      if (testMethods && testMethods.length > 0) {
        for (const methodSpec of testMethods) {
          const [className, methodName] = methodSpec.split('.');
          if (className && methodName) {
            testRequest.tests.push({
              classId: await this.getApexClassId(conn, className),
              testMethods: [methodName]
            });
          }
        }
      }
      
      // If no specific tests provided, run all tests
      if (testRequest.tests.length === 0) {
        console.error('[run-apex-tests] No specific tests provided, running all test classes...');
        const allTestClasses = await this.getAllTestClasses(conn);
        testRequest.tests = allTestClasses.map((cls: any) => ({ classId: cls.Id }));
      }
      
      console.error(`[run-apex-tests] Running ${testRequest.tests.length} test classes...`);
      
      // Execute tests
      const testRun = await conn.tooling.runTestsAsynchronous(testRequest);
      
      // Poll for completion
      const testResult = await this.pollTestCompletion(conn, testRun as string);
      
      // Get detailed results
      const detailedResults = await this.getDetailedTestResults(conn, testRun as string);
      
      // Get code coverage if requested
      let codeCoverage: any[] | undefined = undefined;
      if (includeCoverage) {
        try {
          codeCoverage = await this.getCodeCoverage(conn, testRun as string);
        } catch (coverageError) {
          console.error('[run-apex-tests] Warning: Could not retrieve code coverage:', coverageError);
        }
      }
      
      const result: ApexTestResult = {
        success: testResult.success,
        totalTests: detailedResults.length,
        testsRan: detailedResults.length,
        failures: detailedResults.filter((t: any) => t.Outcome === 'Fail').length,
        successes: detailedResults.filter((t: any) => t.Outcome === 'Pass').length,
        testResults: detailedResults.map((test: any) => ({
          id: test.Id,
          queueItemId: test.QueueItemId,
          stackTrace: test.StackTrace || undefined,
          message: test.Message || undefined,
          asyncApexJobId: test.AsyncApexJobId,
          methodName: test.MethodName,
          outcome: test.Outcome,
          apexClass: {
            id: test.ApexClass?.Id || '',
            name: test.ApexClass?.Name || '',
            namespacePrefix: test.ApexClass?.NamespacePrefix || undefined
          },
          runTime: test.RunTime || undefined
        })),
        codeCoverage: codeCoverage
      };
      
      // Calculate overall coverage if available
      if (codeCoverage && codeCoverage.length > 0) {
        const totalLines = codeCoverage.reduce((sum: number, cov: any) => sum + cov.numLocations, 0);
        const coveredLines = codeCoverage.reduce((sum: number, cov: any) => sum + (cov.numLocations - cov.numLocationsNotCovered), 0);
        result.coverage = {
          totalLines,
          coveredLines,
          coveragePercentage: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
        };
      }
      
      console.error(`[run-apex-tests] Test execution completed. Success: ${result.success}, Failures: ${result.failures}`);
      
      return SalesforceErrorHandler.formatSuccess(result, context);
      
    } catch (error) {
      console.error('[run-apex-tests] Test execution failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Get debug logs with filtering and parsing options
   */
  static async getApexLogs(
    limit: number = 10,
    userId?: string,
    startTime?: string,
    operation?: string
  ): Promise<any> {
    const context = SalesforceErrorHandler.createContext('get-apex-logs', 'log-retrieval');
    
    try {
      console.error('[get-apex-logs] Retrieving debug logs...');
      
      const conn = await ConnectionManager.getConnection();
      
      // Build SOQL query for debug logs
      let query = `
        SELECT Id, LogUserId, LogLength, LastModifiedDate, Request, Operation, 
               Application, Status, DurationMilliseconds, StartTime, Location
        FROM ApexLog
      `;
      
      const conditions: string[] = [];
      
      if (userId) {
        conditions.push(`LogUserId = '${userId}'`);
      }
      
      if (startTime) {
        conditions.push(`StartTime >= ${startTime}`);
      }
      
      if (operation) {
        conditions.push(`Operation = '${operation}'`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY StartTime DESC LIMIT ${limit}`;
      
      console.error('[get-apex-logs] Executing query:', query);
      
      const result = await conn.query(query);
      
      const logs: DebugLogEntry[] = result.records.map((record: any) => ({
        id: record.Id,
        logUserId: record.LogUserId,
        logLength: record.LogLength,
        lastModifiedDate: record.LastModifiedDate,
        request: record.Request,
        operation: record.Operation,
        application: record.Application,
        status: record.Status,
        durationMilliseconds: record.DurationMilliseconds,
        startTime: record.StartTime,
        location: record.Location
      }));
      
      console.error(`[get-apex-logs] Retrieved ${logs.length} debug logs`);
      
      return SalesforceErrorHandler.formatSuccess({
        totalCount: result.totalSize,
        logs: logs
      }, context);
      
    } catch (error) {
      console.error('[get-apex-logs] Log retrieval failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Enable debug logging for the current user
   */
  private static async enableDebugLogging(conn: Connection): Promise<void> {
    try {
      // Get user ID safely
      const userId = (conn.userInfo as any)?.id || (conn.userInfo as any)?.user_id;
      if (!userId) {
        console.error('[execute-apex] Warning: Could not get user ID for debug logging');
        return;
      }
      
      // Check if debug logging is already enabled
      const existingLogs = await conn.query(`
        SELECT Id FROM TraceFlag 
        WHERE TracedEntityId = '${userId}' 
        AND ExpirationDate > ${new Date().toISOString()}
        LIMIT 1
      `);
      
      if (existingLogs.totalSize === 0) {
        // Create debug log level
        const debugLevel = await conn.tooling.sobject('DebugLevel').create({
          DeveloperName: 'MCPServer_Debug_' + Date.now(),
          MasterLabel: 'MCP Server Debug Level',
          Apex: 'DEBUG',
          Callout: 'INFO',
          Database: 'INFO',
          System: 'DEBUG',
          Validation: 'INFO',
          Visualforce: 'INFO',
          Workflow: 'INFO'
        });
        
        // Create trace flag
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 1); // 1 hour from now
        
        await conn.tooling.sobject('TraceFlag').create({
          TracedEntityId: userId,
          DebugLevelId: debugLevel.id,
          LogType: 'USER_DEBUG',
          ExpirationDate: expirationDate.toISOString()
        });
        
        console.error('[execute-apex] Debug logging enabled');
      }
    } catch (error) {
      console.error('[execute-apex] Warning: Could not enable debug logging:', error);
    }
  }
  
  /**
   * Get recent debug logs content
   */
  private static async getRecentDebugLogs(conn: Connection, limit: number = 1): Promise<string[]> {
    // Get user ID safely
    const userId = (conn.userInfo as any)?.id || (conn.userInfo as any)?.user_id;
    if (!userId) {
      console.error('[execute-apex] Warning: Could not get user ID for log retrieval');
      return [];
    }
    
    const logsQuery = `
      SELECT Id FROM ApexLog 
      WHERE LogUserId = '${userId}'
      ORDER BY StartTime DESC 
      LIMIT ${limit}
    `;
    
    const logsResult = await conn.query(logsQuery);
    const logs: string[] = [];
    
    for (const logRecord of logsResult.records) {
      try {
        if (logRecord.Id) {
          const logContent = await conn.tooling.sobject('ApexLog').retrieve(logRecord.Id);
          if (logContent && (logContent as any).Body) {
            logs.push((logContent as any).Body);
          }
        }
      } catch (error) {
        console.error('[execute-apex] Could not retrieve log content for:', logRecord.Id, error);
      }
    }
    
    return logs;
  }
  
  /**
   * Get Apex class ID by name
   */
  private static async getApexClassId(conn: Connection, className: string): Promise<string> {
    const result = await conn.query(`SELECT Id FROM ApexClass WHERE Name = '${className}' LIMIT 1`);
    if (result.totalSize === 0) {
      throw new Error(`Apex class not found: ${className}`);
    }
    return result.records[0].Id as string;
  }
  
  /**
   * Get all test classes
   */
  private static async getAllTestClasses(conn: Connection): Promise<any[]> {
    const result = await conn.query(`
      SELECT Id, Name FROM ApexClass 
      WHERE Name LIKE '%Test%' OR Name LIKE '%_Test' OR Name LIKE 'Test_%'
      ORDER BY Name
    `);
    return result.records;
  }
  
  /**
   * Poll for test completion
   */
  private static async pollTestCompletion(conn: Connection, testRunId: string): Promise<any> {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const result = await conn.query(`
        SELECT Id, Status, ClassesCompleted, ClassesEnqueued, MethodsCompleted, MethodsEnqueued
        FROM ApexTestRunResult 
        WHERE AsyncApexJobId = '${testRunId}'
        LIMIT 1
      `);
      
      if (result.totalSize > 0) {
        const testRun = result.records[0];
        if (testRun.Status === 'Completed' || testRun.Status === 'Failed' || testRun.Status === 'Aborted') {
          return {
            success: testRun.Status === 'Completed',
            status: testRun.Status,
            classesCompleted: testRun.ClassesCompleted,
            classesEnqueued: testRun.ClassesEnqueued,
            methodsCompleted: testRun.MethodsCompleted,
            methodsEnqueued: testRun.MethodsEnqueued
          };
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
    
    throw new Error('Test execution timed out');
  }
  
  /**
   * Get detailed test results
   */
  private static async getDetailedTestResults(conn: Connection, testRunId: string): Promise<any[]> {
    const result = await conn.query(`
      SELECT Id, QueueItemId, StackTrace, Message, AsyncApexJobId, MethodName, Outcome, 
             ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix, RunTime
      FROM ApexTestResult 
      WHERE AsyncApexJobId = '${testRunId}'
      ORDER BY ApexClass.Name, MethodName
    `);
    
    return result.records;
  }
  
  /**
   * Get code coverage information
   */
  private static async getCodeCoverage(conn: Connection, testRunId: string): Promise<any[]> {
    const result = await conn.query(`
      SELECT ApexClassOrTrigger.Id, ApexClassOrTrigger.Name, ApexClassOrTrigger.Type,
             NumLocations, NumLocationsNotCovered
      FROM ApexCodeCoverageAggregate
      WHERE ApexClassOrTrigger.Type IN ('Class', 'Trigger')
      ORDER BY ApexClassOrTrigger.Name
    `);
    
    return result.records.map((record: any) => ({
      id: record.ApexClassOrTrigger?.Id || '',
      name: record.ApexClassOrTrigger?.Name || '',
      type: record.ApexClassOrTrigger?.Type || '',
      numLocations: record.NumLocations || 0,
      numLocationsNotCovered: record.NumLocationsNotCovered || 0,
      coveragePercentage: record.NumLocations > 0 
        ? Math.round(((record.NumLocations - record.NumLocationsNotCovered) / record.NumLocations) * 100)
        : 0
    }));
  }
}
