import { z } from 'zod';
import { Connection } from 'jsforce';
import { ConnectionManager } from '../utils/connection.js';
import { SalesforceErrorHandler, SalesforceErrorContext } from '../utils/errors.js';

/**
 * Metadata Tools for Salesforce MCP Server
 * 
 * Provides tools for deploying and retrieving Salesforce metadata using the Metadata API.
 * Supports package deployment, retrieval, and monitoring of deployment status.
 */
export class MetadataTools {
  
  /**
   * Deploy metadata to Salesforce org
   * Supports zip file deployment with deployment options and status monitoring
   */
  static async deployMetadata(
    zipFile: string,
    options?: {
      allowMissingFiles?: boolean;
      autoUpdatePackage?: boolean;
      checkOnly?: boolean;
      ignoreWarnings?: boolean;
      performRetrieve?: boolean;
      purgeOnDelete?: boolean;
      rollbackOnError?: boolean;
      runTests?: string[];
      singlePackage?: boolean;
    }
  ): Promise<any> {
    const context = SalesforceErrorHandler.createContext('deploy-metadata', 'metadata-deployment');
    
    try {
      console.error('[MetadataTools] Starting metadata deployment');
      
      const conn = await ConnectionManager.getConnection();
      
      // Default deployment options
      const deployOptions = {
        allowMissingFiles: options?.allowMissingFiles ?? false,
        autoUpdatePackage: options?.autoUpdatePackage ?? false,
        checkOnly: options?.checkOnly ?? false,
        ignoreWarnings: options?.ignoreWarnings ?? false,
        performRetrieve: options?.performRetrieve ?? false,
        purgeOnDelete: options?.purgeOnDelete ?? false,
        rollbackOnError: options?.rollbackOnError ?? true,
        runTests: options?.runTests ?? [],
        singlePackage: options?.singlePackage ?? true,
      };

      console.error('[MetadataTools] Deploy options:', deployOptions);

      // Convert base64 zip file to buffer
      let zipBuffer: Buffer;
      try {
        zipBuffer = Buffer.from(zipFile, 'base64');
        console.error('[MetadataTools] Zip file size:', zipBuffer.length, 'bytes');
      } catch (error) {
        throw new Error(`Invalid base64 zip file: ${error}`);
      }

      // Start deployment
      console.error('[MetadataTools] Starting deployment...');
      const deployResult = await conn.metadata.deploy(zipBuffer, deployOptions);
      
      console.error('[MetadataTools] Deployment started, ID:', deployResult.id);

      // Poll for deployment completion
      let deployStatus;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      
      do {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        deployStatus = await conn.metadata.checkDeployStatus(deployResult.id, true);
        attempts++;
        
        console.error(`[MetadataTools] Deployment status check ${attempts}/${maxAttempts}:`, deployStatus.done ? 'COMPLETE' : 'IN_PROGRESS');
        
        if (attempts >= maxAttempts) {
          throw new Error('Deployment timeout - exceeded maximum wait time of 5 minutes');
        }
      } while (!deployStatus.done);

      console.error('[MetadataTools] Deployment completed with status:', deployStatus.success ? 'SUCCESS' : 'FAILED');

      // Return comprehensive deployment result
      const responseData = {
        success: deployStatus.success,
        deploymentId: deployResult.id,
        status: deployStatus,
        summary: {
          componentsDeployed: deployStatus.numberComponentsDeployed || 0,
          componentsTotal: deployStatus.numberComponentsTotal || 0,
          testsPassed: deployStatus.numberTestsCompleted || 0,
          testsTotal: deployStatus.numberTestsTotal || 0,
          checkOnly: deployOptions.checkOnly,
          rollbackOnError: deployOptions.rollbackOnError
        },
        details: deployStatus.details || [],
        testResults: Array.isArray(deployStatus.details) ? deployStatus.details.filter((detail: any) => detail.componentType === 'ApexClass') : []
      };

      return SalesforceErrorHandler.formatSuccess(responseData, context);

    } catch (error) {
      console.error('[MetadataTools] Deployment failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }

  /**
   * Retrieve metadata from Salesforce org
   * 
   * ⚠️ KNOWN ISSUE: This tool is currently disabled due to jsforce API compatibility issues.
   * The jsforce library's metadata.retrieve() method has limitations with types-based retrieval.
   * 
   * TODO: Future implementation should:
   * 1. Use package.xml deployment approach
   * 2. Or implement direct Salesforce Metadata API calls
   * 3. Or wait for jsforce library updates
   * 
   * For now, use deploy-metadata with package.xml files instead.
   */
  static async retrieveMetadata(
    types: Array<{
      name: string;
      members: string[];
    }>,
    options?: {
      apiVersion?: string;
      packageNames?: string[];
      singlePackage?: boolean;
    }
  ): Promise<any> {
    const context = SalesforceErrorHandler.createContext('retrieve-metadata', 'metadata-retrieval');
    
    console.error('[MetadataTools] Retrieve metadata tool is currently disabled');
    
    // Return a clear error message explaining the known issue
    const errorMessage = `⚠️ KNOWN ISSUE: The retrieve-metadata tool is currently disabled due to jsforce API compatibility issues.

The jsforce library's metadata.retrieve() method has limitations with types-based retrieval that cause API format errors.

Workarounds:
1. Use deploy-metadata with package.xml files instead
2. Use Salesforce CLI or other tools for metadata retrieval
3. Wait for future updates that will implement direct Salesforce Metadata API calls

This will be resolved in a future version of the MCP server.`;
    
    return SalesforceErrorHandler.formatError(new Error(errorMessage), context);
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

// Zod schemas for tool validation
export const deployMetadataSchema = z.object({
  zipFile: z.string().describe('Base64 encoded zip file containing metadata to deploy'),
  options: z.object({
    allowMissingFiles: z.boolean().optional().describe('Allow deployment with missing files'),
    autoUpdatePackage: z.boolean().optional().describe('Auto-update package.xml'),
    checkOnly: z.boolean().optional().describe('Validate deployment without saving changes'),
    ignoreWarnings: z.boolean().optional().describe('Ignore warnings during deployment'),
    performRetrieve: z.boolean().optional().describe('Perform retrieve after deployment'),
    purgeOnDelete: z.boolean().optional().describe('Purge components on delete'),
    rollbackOnError: z.boolean().optional().describe('Rollback all changes on any error'),
    runTests: z.array(z.string()).optional().describe('Specific test classes to run'),
    singlePackage: z.boolean().optional().describe('Deploy as single package')
  }).optional().describe('Deployment options')
});

export const retrieveMetadataSchema = z.object({
  types: z.array(z.object({
    name: z.string().describe('Metadata type name (e.g., ApexClass, CustomObject)'),
    members: z.array(z.string()).describe('Specific members to retrieve (use * for all)')
  })).describe('Metadata types and members to retrieve'),
  options: z.object({
    apiVersion: z.string().optional().describe('API version to use for retrieval'),
    packageNames: z.array(z.string()).optional().describe('Specific package names to retrieve'),
    singlePackage: z.boolean().optional().describe('Retrieve as single package')
  }).optional().describe('Retrieval options')
});

export const listMetadataTypesSchema = z.object({
  apiVersion: z.string().optional().describe('API version to use for listing metadata types')
});
