import { z } from 'zod';
import { Connection } from 'jsforce';
import { ConnectionManager } from '../utils/connection.js';
import { SalesforceErrorHandler, SalesforceErrorContext } from '../utils/errors.js';

/**
 * Metadata Tools for Salesforce MCP Server
 * 
 * Provides tools for deploying and retrieving Salesforce metadata using individual component operations.
 * Supports component-based deployment and retrieval without zip file handling.
 */
export class MetadataTools {
  
  /**
   * Deploy individual metadata components to Salesforce org
   * Supports various metadata types using appropriate jsforce methods
   */
  static async deployMetadata(
    components: Array<{
      type: string;
      fullName: string;
      metadata: any;
    }> | {
      type: string;
      fullName: string;
      metadata: any;
    },
    options?: {
      checkOnly?: boolean;
      rollbackOnError?: boolean;
      runTests?: string[];
    }
  ): Promise<any> {
    const context = SalesforceErrorHandler.createContext('deploy-metadata', 'metadata-deployment');
    
    try {
      console.error('[MetadataTools] Starting component-based metadata deployment');
      
      const conn = await ConnectionManager.getConnection();
      
      // Normalize input to array
      const componentArray = Array.isArray(components) ? components : [components];
      console.error('[MetadataTools] Components to deploy:', componentArray.length);
      
      const deployOptions = {
        checkOnly: options?.checkOnly ?? false,
        rollbackOnError: options?.rollbackOnError ?? true,
        runTests: options?.runTests ?? []
      };

      console.error('[MetadataTools] Deploy options:', deployOptions);

      const results = [];
      const errors = [];

      // Process each component
      for (const component of componentArray) {
        try {
          console.error(`[MetadataTools] Deploying ${component.type}: ${component.fullName}`);
          
          let result;
          
          // Route to appropriate deployment method based on metadata type
          switch (component.type) {
            case 'ApexClass':
            case 'ApexTrigger':
            case 'ApexComponent':
            case 'ApexPage':
              result = await this.deployApexComponent(conn, component, deployOptions);
              break;
              
            case 'CustomObject':
              result = await this.deployCustomObject(conn, component, deployOptions);
              break;
              
            case 'CustomField':
              result = await this.deployCustomField(conn, component, deployOptions);
              break;
              
            case 'ValidationRule':
            case 'WorkflowRule':
            case 'Flow':
            case 'CustomLabel':
            case 'CustomTab':
            case 'CustomApplication':
              result = await this.deployGenericMetadata(conn, component, deployOptions);
              break;
              
            default:
              result = await this.deployGenericMetadata(conn, component, deployOptions);
              break;
          }
          
          results.push({
            component: component.fullName,
            type: component.type,
            success: true,
            result: result
          });
          
        } catch (error) {
          console.error(`[MetadataTools] Failed to deploy ${component.type}: ${component.fullName}`, error);
          
          const errorInfo = {
            component: component.fullName,
            type: component.type,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
          
          errors.push(errorInfo);
          
          if (deployOptions.rollbackOnError) {
            throw new Error(`Deployment failed for ${component.fullName}: ${errorInfo.error}`);
          }
        }
      }

      // Run tests if specified
      let testResults = null;
      if (deployOptions.runTests && deployOptions.runTests.length > 0) {
        console.error('[MetadataTools] Running specified tests:', deployOptions.runTests);
        try {
          testResults = await this.runDeploymentTests(conn, deployOptions.runTests);
        } catch (testError) {
          console.error('[MetadataTools] Test execution failed:', testError);
          if (deployOptions.rollbackOnError) {
            throw new Error(`Test execution failed: ${testError}`);
          }
        }
      }

      const responseData = {
        success: errors.length === 0,
        checkOnly: deployOptions.checkOnly,
        componentsDeployed: results.length,
        componentsTotal: componentArray.length,
        componentsFailed: errors.length,
        results: results,
        errors: errors,
        testResults: testResults
      };

      console.error('[MetadataTools] Deployment completed:', responseData.success ? 'SUCCESS' : 'PARTIAL/FAILED');
      return SalesforceErrorHandler.formatSuccess(responseData, context);

    } catch (error) {
      console.error('[MetadataTools] Deployment failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }

  /**
   * Deploy Apex components using Tooling API
   */
  private static async deployApexComponent(conn: Connection, component: any, options: any): Promise<any> {
    const { type, fullName, metadata } = component;
    
    // Use Tooling API for Apex components
    const tooling = conn.tooling;
    
    if (options.checkOnly) {
      // For check-only, we'll validate the syntax
      console.error(`[MetadataTools] Check-only mode for ${type}: ${fullName}`);
      return { id: 'check-only', success: true, checkOnly: true };
    }
    
    // Prepare the component data
    const componentData: any = {
      Name: fullName,
      Body: metadata.body || metadata.Body || metadata.content || ''
    };
    
    // Add type-specific fields
    if (type === 'ApexClass') {
      componentData.IsValid = true;
    }
    
    try {
      // Try to find existing component
      const existing = await tooling.sobject(type).find({ Name: fullName }).limit(1).execute();
      
      if (existing && existing.length > 0) {
        // Update existing
        const updateData = { ...componentData };
        delete updateData.Name;
        const result = await tooling.sobject(type).update({ Id: existing[0].Id, ...updateData });
        return { id: existing[0].Id, success: (result as any).success, action: 'updated' };
      } else {
        // Create new
        const result = await tooling.sobject(type).create(componentData);
        return { id: (result as any).id, success: (result as any).success, action: 'created' };
      }
    } catch (error) {
      throw new Error(`Failed to deploy ${type} ${fullName}: ${error}`);
    }
  }

  /**
   * Deploy Custom Object using Metadata API
   */
  private static async deployCustomObject(conn: Connection, component: any, options: any): Promise<any> {
    const { fullName, metadata } = component;
    
    if (options.checkOnly) {
      console.error(`[MetadataTools] Check-only mode for CustomObject: ${fullName}`);
      return { success: true, checkOnly: true };
    }
    
    try {
      // Use metadata API for custom objects
      const result = await conn.metadata.upsert('CustomObject', [metadata]);
      const resultItem = Array.isArray(result) ? result[0] : result;
      return { success: resultItem.success, id: resultItem.fullName, action: 'upserted' };
    } catch (error) {
      throw new Error(`Failed to deploy CustomObject ${fullName}: ${error}`);
    }
  }

  /**
   * Deploy Custom Field using Metadata API
   */
  private static async deployCustomField(conn: Connection, component: any, options: any): Promise<any> {
    const { fullName, metadata } = component;
    
    if (options.checkOnly) {
      console.error(`[MetadataTools] Check-only mode for CustomField: ${fullName}`);
      return { success: true, checkOnly: true };
    }
    
    try {
      const result = await conn.metadata.upsert('CustomField', [metadata]);
      const resultItem = Array.isArray(result) ? result[0] : result;
      return { success: resultItem.success, id: resultItem.fullName, action: 'upserted' };
    } catch (error) {
      throw new Error(`Failed to deploy CustomField ${fullName}: ${error}`);
    }
  }

  /**
   * Deploy generic metadata using Metadata API
   */
  private static async deployGenericMetadata(conn: Connection, component: any, options: any): Promise<any> {
    const { type, fullName, metadata } = component;
    
    if (options.checkOnly) {
      console.error(`[MetadataTools] Check-only mode for ${type}: ${fullName}`);
      return { success: true, checkOnly: true };
    }
    
    try {
      const result = await conn.metadata.upsert(type, [metadata]);
      const resultItem = Array.isArray(result) ? result[0] : result;
      return { success: resultItem.success, id: resultItem.fullName, action: 'upserted' };
    } catch (error) {
      throw new Error(`Failed to deploy ${type} ${fullName}: ${error}`);
    }
  }

  /**
   * Run tests for deployment validation
   */
  private static async runDeploymentTests(conn: Connection, testClasses: string[]): Promise<any> {
    try {
      // Create test request object
      const testRequest = {
        tests: testClasses.map(className => ({ className }))
      };
      
      const testResult = await conn.tooling.runTestsAsynchronous(testRequest);
      
      if (!testResult) {
        throw new Error('Test execution returned null result');
      }
      
      // Poll for test completion
      let attempts = 0;
      const maxAttempts = 60;
      let testStatus;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 5000));
        testStatus = await conn.tooling.query(`SELECT Id, Status, ApexLogId FROM ApexTestQueueItem WHERE ParentJobId = '${testResult}'`);
        attempts++;
      } while (testStatus.records.some((record: any) => record.Status === 'Queued' || record.Status === 'Processing') && attempts < maxAttempts);
      
      return {
        testRunId: testResult,
        status: testStatus.records,
        completed: attempts < maxAttempts
      };
    } catch (error) {
      throw new Error(`Test execution failed: ${error}`);
    }
  }

  /**
   * Retrieve individual metadata components from Salesforce org
   * Returns components as JSON objects instead of zip files
   */
  static async retrieveMetadata(
    components: Array<{
      type: string;
      fullName: string;
    }> | {
      type: string;
      fullName: string;
    },
    options?: {
      includeBody?: boolean;
      apiVersion?: string;
    }
  ): Promise<any> {
    const context = SalesforceErrorHandler.createContext('retrieve-metadata', 'metadata-retrieval');
    
    try {
      console.error('[MetadataTools] Starting component-based metadata retrieval');
      
      const conn = await ConnectionManager.getConnection();
      
      // Normalize input to array
      const componentArray = Array.isArray(components) ? components : [components];
      console.error('[MetadataTools] Components to retrieve:', componentArray.length);
      
      const retrieveOptions = {
        includeBody: options?.includeBody ?? true,
        apiVersion: options?.apiVersion ?? conn.version
      };

      const results = [];
      const errors = [];

      // Process each component
      for (const component of componentArray) {
        try {
          console.error(`[MetadataTools] Retrieving ${component.type}: ${component.fullName}`);
          
          let result;
          
          // Route to appropriate retrieval method based on metadata type
          switch (component.type) {
            case 'ApexClass':
            case 'ApexTrigger':
            case 'ApexComponent':
            case 'ApexPage':
              result = await this.retrieveApexComponent(conn, component, retrieveOptions);
              break;
              
            case 'CustomObject':
              result = await this.retrieveCustomObject(conn, component, retrieveOptions);
              break;
              
            case 'CustomField':
              result = await this.retrieveCustomField(conn, component, retrieveOptions);
              break;
              
            default:
              result = await this.retrieveGenericMetadata(conn, component, retrieveOptions);
              break;
          }
          
          results.push({
            component: component.fullName,
            type: component.type,
            success: true,
            metadata: result
          });
          
        } catch (error) {
          console.error(`[MetadataTools] Failed to retrieve ${component.type}: ${component.fullName}`, error);
          
          errors.push({
            component: component.fullName,
            type: component.type,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const responseData = {
        success: errors.length === 0,
        componentsRetrieved: results.length,
        componentsTotal: componentArray.length,
        componentsFailed: errors.length,
        results: results,
        errors: errors,
        apiVersion: retrieveOptions.apiVersion
      };

      console.error('[MetadataTools] Retrieval completed:', responseData.success ? 'SUCCESS' : 'PARTIAL/FAILED');
      return SalesforceErrorHandler.formatSuccess(responseData, context);

    } catch (error) {
      console.error('[MetadataTools] Retrieval failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }

  /**
   * Retrieve Apex components using Tooling API
   */
  private static async retrieveApexComponent(conn: Connection, component: any, options: any): Promise<any> {
    const { type, fullName } = component;
    
    try {
      const tooling = conn.tooling;
      const fields = options.includeBody ? 'Id, Name, Body, CreatedDate, LastModifiedDate' : 'Id, Name, CreatedDate, LastModifiedDate';
      
      const result = await tooling.sobject(type).find({ Name: fullName }, fields).limit(1).execute();
      
      if (!result || result.length === 0) {
        throw new Error(`${type} ${fullName} not found`);
      }
      
      return result[0];
    } catch (error) {
      throw new Error(`Failed to retrieve ${type} ${fullName}: ${error}`);
    }
  }

  /**
   * Retrieve Custom Object using Metadata API
   */
  private static async retrieveCustomObject(conn: Connection, component: any, options: any): Promise<any> {
    const { fullName } = component;
    
    try {
      const result = await conn.metadata.read('CustomObject', [fullName]);
      
      if (!result || result.length === 0) {
        throw new Error(`CustomObject ${fullName} not found`);
      }
      
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      throw new Error(`Failed to retrieve CustomObject ${fullName}: ${error}`);
    }
  }

  /**
   * Retrieve Custom Field using Metadata API
   */
  private static async retrieveCustomField(conn: Connection, component: any, options: any): Promise<any> {
    const { fullName } = component;
    
    try {
      const result = await conn.metadata.read('CustomField', [fullName]);
      
      if (!result || result.length === 0) {
        throw new Error(`CustomField ${fullName} not found`);
      }
      
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      throw new Error(`Failed to retrieve CustomField ${fullName}: ${error}`);
    }
  }

  /**
   * Retrieve generic metadata using Metadata API
   */
  private static async retrieveGenericMetadata(conn: Connection, component: any, options: any): Promise<any> {
    const { type, fullName } = component;
    
    try {
      const result = await conn.metadata.read(type, [fullName]);
      
      if (!result || result.length === 0) {
        throw new Error(`${type} ${fullName} not found`);
      }
      
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      throw new Error(`Failed to retrieve ${type} ${fullName}: ${error}`);
    }
  }

  /**
   * List metadata types available in the org
   * Useful for discovering what metadata can be retrieved
   */
  static async listMetadataTypes(apiVersion?: string): Promise<any> {
    const context = SalesforceErrorHandler.createContext('list-metadata-types', 'metadata-discovery');
    
    try {
      console.error('[MetadataTools] Listing metadata types');
      
      const conn = await ConnectionManager.getConnection();
      const version = parseFloat(apiVersion ?? conn.version);
      
      console.error('[MetadataTools] Using API version:', version);
      
      const metadataTypes = await conn.metadata.describe(version.toString());
      
      console.error('[MetadataTools] Found', metadataTypes.metadataObjects?.length || 0, 'metadata types');
      
      const responseData = {
        success: true,
        apiVersion: version.toString(),
        metadataTypes: metadataTypes.metadataObjects || [],
        organizationNamespace: metadataTypes.organizationNamespace,
        partialSaveAllowed: metadataTypes.partialSaveAllowed,
        testRequired: metadataTypes.testRequired
      };

      return SalesforceErrorHandler.formatSuccess(responseData, context);

    } catch (error) {
      console.error('[MetadataTools] Failed to list metadata types:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
}

export const deployMetadataSchema = z.object({
  components: z.union([
    z.array(z.object({
      type: z.string().describe('Metadata type (e.g., ApexClass, CustomObject, CustomField)'),
      fullName: z.string().describe('Full name of the component'),
      metadata: z.any().describe('Metadata definition object')
    })),
    z.object({
      type: z.string().describe('Metadata type (e.g., ApexClass, CustomObject, CustomField)'),
      fullName: z.string().describe('Full name of the component'),
      metadata: z.any().describe('Metadata definition object')
    })
  ]).describe('Single component or array of components to deploy'),
  options: z.object({
    checkOnly: z.boolean().optional().describe('Validate deployment without saving changes'),
    rollbackOnError: z.boolean().optional().describe('Rollback all changes on any error'),
    runTests: z.array(z.string()).optional().describe('Specific test classes to run')
  }).optional().describe('Deployment options')
});

export const retrieveMetadataSchema = z.object({
  components: z.union([
    z.array(z.object({
      type: z.string().describe('Metadata type (e.g., ApexClass, CustomObject, CustomField)'),
      fullName: z.string().describe('Full name of the component to retrieve')
    })),
    z.object({
      type: z.string().describe('Metadata type (e.g., ApexClass, CustomObject, CustomField)'),
      fullName: z.string().describe('Full name of the component to retrieve')
    })
  ]).describe('Single component or array of components to retrieve'),
  options: z.object({
    includeBody: z.boolean().optional().describe('Include component body/source code'),
    apiVersion: z.string().optional().describe('API version to use for retrieval')
  }).optional().describe('Retrieval options')
});

export const listMetadataTypesSchema = z.object({
  apiVersion: z.string().optional().describe('API version to use for listing metadata types')
});
