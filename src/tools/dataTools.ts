import { Connection } from 'jsforce';
import { z } from 'zod';
import { ConnectionManager } from '../utils/connection.js';
import { SalesforceErrorHandler } from '../utils/errors.js';

/**
 * Data Management Tools for Salesforce MCP Server
 * Provides CRUD operations with bulk support and advanced features
 */
export class DataTools {
  /**
   * Create a single record or multiple records
   */
  static async createRecord(
    sobjectType: string,
    recordData: any,
    options?: {
      allOrNone?: boolean;
    }
  ): Promise<any> {
    console.error('[DataTools] Creating record(s) for:', sobjectType);
    
    try {
      const conn = await ConnectionManager.getConnection();
      
      // Determine if this is a single record or bulk operation
      const isArray = Array.isArray(recordData);
      const records = isArray ? recordData : [recordData];
      
      console.error(`[DataTools] Processing ${records.length} record(s)`);
      
      // Use bulk API for large operations (>200 records) or when explicitly requested
      if (records.length > 200) {
        console.error('[DataTools] Using Bulk API for large operation');
        return await this.bulkCreateRecords(conn, sobjectType, records, options);
      }
      
      // Use standard API for smaller operations
      let result;
      if (isArray) {
        // Multiple records via standard API
        result = await conn.sobject(sobjectType).create(records, {
          allOrNone: options?.allOrNone ?? false
        });
      } else {
        // Single record
        result = await conn.sobject(sobjectType).create(recordData);
      }
      
      console.error('[DataTools] Record(s) created successfully');
      
      const responseData = {
        success: true,
        operation: 'create',
        sobjectType,
        recordCount: records.length,
        usedBulkAPI: false,
        results: result
      };
      
      const context = SalesforceErrorHandler.createContext('create-record', 'create');
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error: any) {
      console.error('[DataTools] Create operation failed:', error);
      const context = SalesforceErrorHandler.createContext('create-record', 'create');
      
      // Enhance error for required field issues
      if (error.message?.includes('REQUIRED_FIELD_MISSING') || 
          error.message?.includes('required field') ||
          error.message?.includes('Required fields are missing') ||
          error.errorCode === 'REQUIRED_FIELD_MISSING') {
        
        const enhancedError = {
          ...error,
          enhancedMessage: `Missing required fields for ${sobjectType}. Use describe-sobject tool to see all required fields.`,
          suggestion: `Try: describe-sobject with sobjectType: "${sobjectType}" to see which fields are required`,
          helpfulTip: "Look for fields where 'nillable' is false and 'defaultedOnCreate' is false",
          quickFix: `Example: { "sobjectType": "${sobjectType}", "useCache": true }`
        };
        
        return SalesforceErrorHandler.formatError(enhancedError, context);
      }
      
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Retrieve a record by ID with field selection
   */
  static async getRecord(
    sobjectType: string,
    recordId: string,
    fields?: string[]
  ): Promise<any> {
    console.error('[DataTools] Retrieving record:', recordId, 'from:', sobjectType);
    
    try {
      const conn = await ConnectionManager.getConnection();
      
      let result;
      if (fields && fields.length > 0) {
        // Retrieve specific fields
        const fieldList = fields.join(',');
        console.error('[DataTools] Retrieving fields:', fieldList);
        const queryResult = await conn.query(`SELECT ${fieldList} FROM ${sobjectType} WHERE Id = '${recordId}'`);
        result = queryResult.records[0] || null;
      } else {
        // Retrieve all accessible fields
        console.error('[DataTools] Retrieving all accessible fields');
        result = await conn.sobject(sobjectType).retrieve(recordId);
      }
      
      console.error('[DataTools] Record retrieved successfully');
      
      const responseData = {
        success: true,
        operation: 'retrieve',
        sobjectType,
        recordId,
        fieldsRequested: fields?.length || 'all',
        record: result
      };
      
      const context = SalesforceErrorHandler.createContext('get-record', 'retrieve');
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error: any) {
      console.error('[DataTools] Retrieve operation failed:', error);
      const context = SalesforceErrorHandler.createContext('get-record', 'retrieve');
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Update a single record or multiple records
   */
  static async updateRecord(
    sobjectType: string,
    recordData: any,
    options?: {
      allOrNone?: boolean;
    }
  ): Promise<any> {
    console.error('[DataTools] Updating record(s) for:', sobjectType);
    
    try {
      const conn = await ConnectionManager.getConnection();
      
      // Determine if this is a single record or bulk operation
      const isArray = Array.isArray(recordData);
      const records = isArray ? recordData : [recordData];
      
      // Validate that all records have IDs
      for (const record of records) {
        if (!record.Id) {
          throw new Error('All records must have an Id field for update operations');
        }
      }
      
      console.error(`[DataTools] Processing ${records.length} record(s) for update`);
      
      // Use bulk API for large operations (>200 records)
      if (records.length > 200) {
        console.error('[DataTools] Using Bulk API for large update operation');
        return await this.bulkUpdateRecords(conn, sobjectType, records, options);
      }
      
      // Use standard API for smaller operations
      let result;
      if (isArray) {
        // Multiple records via standard API
        result = await conn.sobject(sobjectType).update(records, {
          allOrNone: options?.allOrNone ?? false
        });
      } else {
        // Single record
        result = await conn.sobject(sobjectType).update(recordData);
      }
      
      console.error('[DataTools] Record(s) updated successfully');
      
      const responseData = {
        success: true,
        operation: 'update',
        sobjectType,
        recordCount: records.length,
        usedBulkAPI: false,
        results: result
      };
      
      const context = SalesforceErrorHandler.createContext('update-record', 'update');
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error: any) {
      console.error('[DataTools] Update operation failed:', error);
      const context = SalesforceErrorHandler.createContext('update-record', 'update');
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Delete records by ID(s)
   */
  static async deleteRecord(
    sobjectType: string,
    recordIds: string | string[],
    options?: {
      allOrNone?: boolean;
    }
  ): Promise<any> {
    console.error('[DataTools] Deleting record(s) from:', sobjectType);
    
    try {
      const conn = await ConnectionManager.getConnection();
      
      // Normalize to array
      const ids = Array.isArray(recordIds) ? recordIds : [recordIds];
      
      console.error(`[DataTools] Processing ${ids.length} record(s) for deletion`);
      
      // Use bulk API for large operations (>200 records)
      if (ids.length > 200) {
        console.error('[DataTools] Using Bulk API for large delete operation');
        return await this.bulkDeleteRecords(conn, sobjectType, ids, options);
      }
      
      // Use standard API for smaller operations
      let result;
      if (ids.length === 1) {
        // Single record
        result = await conn.sobject(sobjectType).destroy(ids[0]);
      } else {
        // Multiple records
        result = await conn.sobject(sobjectType).destroy(ids, {
          allOrNone: options?.allOrNone ?? false
        });
      }
      
      console.error('[DataTools] Record(s) deleted successfully');
      
      const responseData = {
        success: true,
        operation: 'delete',
        sobjectType,
        recordCount: ids.length,
        usedBulkAPI: false,
        results: result
      };
      
      const context = SalesforceErrorHandler.createContext('delete-record', 'delete');
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error: any) {
      console.error('[DataTools] Delete operation failed:', error);
      const context = SalesforceErrorHandler.createContext('delete-record', 'delete');
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  /**
   * Upsert records using external ID
   */
  static async upsertRecord(
    sobjectType: string,
    externalIdField: string,
    recordData: any,
    options?: {
      allOrNone?: boolean;
    }
  ): Promise<any> {
    console.error('[DataTools] Upserting record(s) for:', sobjectType, 'using external ID field:', externalIdField);
    
    try {
      const conn = await ConnectionManager.getConnection();
      
      // Determine if this is a single record or bulk operation
      const isArray = Array.isArray(recordData);
      const records = isArray ? recordData : [recordData];
      
      console.error(`[DataTools] Processing ${records.length} record(s) for upsert`);
      
      // Use bulk API for large operations (>200 records)
      if (records.length > 200) {
        console.error('[DataTools] Using Bulk API for large upsert operation');
        return await this.bulkUpsertRecords(conn, sobjectType, externalIdField, records, options);
      }
      
      // Use standard API for smaller operations
      let result;
      if (isArray) {
        // Multiple records via standard API
        result = await conn.sobject(sobjectType).upsert(records, externalIdField, {
          allOrNone: options?.allOrNone ?? false
        });
      } else {
        // Single record
        result = await conn.sobject(sobjectType).upsert(recordData, externalIdField);
      }
      
      console.error('[DataTools] Record(s) upserted successfully');
      
      const responseData = {
        success: true,
        operation: 'upsert',
        sobjectType,
        externalIdField,
        recordCount: records.length,
        usedBulkAPI: false,
        results: result
      };
      
      const context = SalesforceErrorHandler.createContext('upsert-record', 'upsert');
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error: any) {
      console.error('[DataTools] Upsert operation failed:', error);
      const context = SalesforceErrorHandler.createContext('upsert-record', 'upsert');
      return SalesforceErrorHandler.formatError(error, context);
    }
  }
  
  // Bulk API helper methods
  private static async bulkCreateRecords(
    conn: Connection,
    sobjectType: string,
    records: any[],
    options?: any
  ): Promise<any> {
    console.error('[DataTools] Starting bulk create operation');
    
    const job = conn.bulk.createJob(sobjectType, 'insert', {
      concurrencyMode: 'Parallel'
    });
    
    const batch = job.createBatch();
    batch.execute(records);
    
    return new Promise((resolve, reject) => {
      batch.on('response', (results: any) => {
        console.error('[DataTools] Bulk create completed');
        const responseData = {
          success: true,
          operation: 'create',
          sobjectType,
          recordCount: records.length,
          usedBulkAPI: true,
          results: results
        };
        
        const context = SalesforceErrorHandler.createContext('create-record', 'bulk-create');
        resolve(SalesforceErrorHandler.formatSuccess(responseData, context));
      });
      
      batch.on('error', (error: any) => {
        console.error('[DataTools] Bulk create failed:', error);
        reject(error);
      });
    });
  }
  
  private static async bulkUpdateRecords(
    conn: Connection,
    sobjectType: string,
    records: any[],
    options?: any
  ): Promise<any> {
    console.error('[DataTools] Starting bulk update operation');
    
    const job = conn.bulk.createJob(sobjectType, 'update', {
      concurrencyMode: 'Parallel'
    });
    
    const batch = job.createBatch();
    batch.execute(records);
    
    return new Promise((resolve, reject) => {
      batch.on('response', (results: any) => {
        console.error('[DataTools] Bulk update completed');
        const responseData = {
          success: true,
          operation: 'update',
          sobjectType,
          recordCount: records.length,
          usedBulkAPI: true,
          results: results
        };
        
        const context = SalesforceErrorHandler.createContext('update-record', 'bulk-update');
        resolve(SalesforceErrorHandler.formatSuccess(responseData, context));
      });
      
      batch.on('error', (error: any) => {
        console.error('[DataTools] Bulk update failed:', error);
        reject(error);
      });
    });
  }
  
  private static async bulkDeleteRecords(
    conn: Connection,
    sobjectType: string,
    recordIds: string[],
    options?: any
  ): Promise<any> {
    console.error('[DataTools] Starting bulk delete operation');
    
    // Convert IDs to objects for bulk API
    const records = recordIds.map(id => ({ Id: id }));
    
    const job = conn.bulk.createJob(sobjectType, 'delete', {
      concurrencyMode: 'Parallel'
    });
    
    const batch = job.createBatch();
    batch.execute(records);
    
    return new Promise((resolve, reject) => {
      batch.on('response', (results: any) => {
        console.error('[DataTools] Bulk delete completed');
        const responseData = {
          success: true,
          operation: 'delete',
          sobjectType,
          recordCount: recordIds.length,
          usedBulkAPI: true,
          results: results
        };
        
        const context = SalesforceErrorHandler.createContext('delete-record', 'bulk-delete');
        resolve(SalesforceErrorHandler.formatSuccess(responseData, context));
      });
      
      batch.on('error', (error: any) => {
        console.error('[DataTools] Bulk delete failed:', error);
        reject(error);
      });
    });
  }
  
  private static async bulkUpsertRecords(
    conn: Connection,
    sobjectType: string,
    externalIdField: string,
    records: any[],
    options?: any
  ): Promise<any> {
    console.error('[DataTools] Starting bulk upsert operation');
    
    const job = conn.bulk.createJob(sobjectType, 'upsert', {
      concurrencyMode: 'Parallel'
    });
    
    const batch = job.createBatch();
    batch.execute(records);
    
    return new Promise((resolve, reject) => {
      batch.on('response', (results: any) => {
        console.error('[DataTools] Bulk upsert completed');
        const responseData = {
          success: true,
          operation: 'upsert',
          sobjectType,
          externalIdField,
          recordCount: records.length,
          usedBulkAPI: true,
          results: results
        };
        
        const context = SalesforceErrorHandler.createContext('upsert-record', 'bulk-upsert');
        resolve(SalesforceErrorHandler.formatSuccess(responseData, context));
      });
      
      batch.on('error', (error: any) => {
        console.error('[DataTools] Bulk upsert failed:', error);
        reject(error);
      });
    });
  }
}

// Zod schemas for validation
export const CreateRecordSchema = z.object({
  sobjectType: z.string().min(1, 'SObject type is required'),
  recordData: z.union([z.record(z.any()), z.array(z.record(z.any()))]),
  options: z.object({
    allOrNone: z.boolean().optional()
  }).optional()
});

export const GetRecordSchema = z.object({
  sobjectType: z.string().min(1, 'SObject type is required'),
  recordId: z.string().min(1, 'Record ID is required'),
  fields: z.array(z.string()).optional()
});

export const UpdateRecordSchema = z.object({
  sobjectType: z.string().min(1, 'SObject type is required'),
  recordData: z.union([z.record(z.any()), z.array(z.record(z.any()))]),
  options: z.object({
    allOrNone: z.boolean().optional()
  }).optional()
});

export const DeleteRecordSchema = z.object({
  sobjectType: z.string().min(1, 'SObject type is required'),
  recordIds: z.union([z.string(), z.array(z.string())]),
  options: z.object({
    allOrNone: z.boolean().optional()
  }).optional()
});

export const UpsertRecordSchema = z.object({
  sobjectType: z.string().min(1, 'SObject type is required'),
  externalIdField: z.string().min(1, 'External ID field is required'),
  recordData: z.union([z.record(z.any()), z.array(z.record(z.any()))]),
  options: z.object({
    allOrNone: z.boolean().optional()
  }).optional()
});
