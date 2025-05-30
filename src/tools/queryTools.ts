/**
 * Query Tools for Salesforce MCP Server
 * 
 * Implements SOQL/SOSL query execution and SObject metadata retrieval
 * with auto-bulk switching and caching capabilities.
 */

import { Connection } from 'jsforce';
import { ConnectionManager } from '../utils/connection.js';
import { SalesforceErrorHandler, SalesforceErrorContext } from '../utils/errors.js';

// Cache for SObject metadata (1 hour TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class MetadataCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  static clear(): void {
    this.cache.clear();
  }
}

export class QueryTools {
  private static readonly BULK_THRESHOLD = 2000;

  /**
   * Execute SOQL query with auto-bulk switching
   */
  static async executeSoql(query: string, useBulk?: boolean): Promise<any> {
    const context = SalesforceErrorHandler.createContext('execute-soql', 'query-execution');
    
    try {
      console.error('[execute-soql] Executing SOQL query:', query.substring(0, 100) + '...');
      
      const conn = await ConnectionManager.getConnection();
      
      // Determine if we should use bulk API
      const shouldUseBulk = useBulk !== undefined ? useBulk : this.shouldUseBulkForQuery(query);
      
      let result: any;
      let executionMethod: string;
      
      if (shouldUseBulk) {
        console.error('[execute-soql] Using paginated query for large result set');
        executionMethod = 'paginated';
        result = await this.executePaginatedQuery(conn, query);
      } else {
        console.error('[execute-soql] Using standard API');
        executionMethod = 'standard';
        result = await conn.query(query);
      }
      
      const responseData = {
        success: true,
        totalSize: result.totalSize || result.records?.length || 0,
        done: result.done !== false,
        records: result.records || [],
        executionMethod,
        query: query,
        timestamp: new Date().toISOString()
      };
      
      console.error(`[execute-soql] Query executed successfully. Records: ${responseData.totalSize}, Method: ${executionMethod}`);
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error) {
      console.error('[execute-soql] Query execution failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }

  /**
   * Execute SOSL search with multi-object support
   */
  static async executeSosl(searchQuery: string): Promise<any> {
    const context = SalesforceErrorHandler.createContext('execute-sosl', 'search-execution');
    
    try {
      console.error('[execute-sosl] Executing SOSL search:', searchQuery.substring(0, 100) + '...');
      
      const conn = await ConnectionManager.getConnection();
      const result = await conn.search(searchQuery);
      
      const responseData = {
        success: true,
        searchRecords: result.searchRecords || [],
        totalResults: result.searchRecords?.length || 0,
        searchQuery: searchQuery,
        timestamp: new Date().toISOString()
      };
      
      console.error(`[execute-sosl] Search executed successfully. Results: ${responseData.totalResults}`);
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error) {
      console.error('[execute-sosl] Search execution failed:', error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }

  /**
   * Describe SObject with caching (1 hour TTL)
   */
  static async describeSObject(sobjectType: string, useCache: boolean = true): Promise<any> {
    const context = SalesforceErrorHandler.createContext('describe-sobject', 'metadata-retrieval');
    
    try {
      console.error(`[describe-sobject] Describing SObject: ${sobjectType}`);
      
      // Check cache first
      const cacheKey = `describe_${sobjectType}`;
      if (useCache) {
        const cached = MetadataCache.get(cacheKey);
        if (cached) {
          console.error(`[describe-sobject] Returning cached metadata for ${sobjectType}`);
          return SalesforceErrorHandler.formatSuccess({
            ...cached,
            fromCache: true,
            timestamp: new Date().toISOString()
          }, context);
        }
      }
      
      const conn = await ConnectionManager.getConnection();
      const result = await conn.sobject(sobjectType).describe();
      
      const responseData = {
        success: true,
        sobjectType: sobjectType,
        name: result.name,
        label: result.label,
        labelPlural: result.labelPlural,
        keyPrefix: result.keyPrefix,
        createable: result.createable,
        updateable: result.updateable,
        deletable: result.deletable,
        queryable: result.queryable,
        searchable: result.searchable,
        fields: result.fields?.map(field => ({
          name: field.name,
          label: field.label,
          type: field.type,
          length: field.length,
          required: !field.nillable,
          unique: field.unique,
          createable: field.createable,
          updateable: field.updateable,
          picklistValues: field.picklistValues
        })) || [],
        recordTypeInfos: result.recordTypeInfos || [],
        childRelationships: result.childRelationships?.map(rel => ({
          childSObject: rel.childSObject,
          field: rel.field,
          relationshipName: rel.relationshipName
        })) || [],
        fromCache: false,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      if (useCache) {
        MetadataCache.set(cacheKey, responseData);
      }
      
      console.error(`[describe-sobject] SObject described successfully: ${sobjectType}`);
      return SalesforceErrorHandler.formatSuccess(responseData, context);
      
    } catch (error) {
      console.error(`[describe-sobject] Failed to describe SObject ${sobjectType}:`, error);
      return SalesforceErrorHandler.formatError(error, context);
    }
  }

  /**
   * Determine if query should use bulk API based on heuristics
   */
  private static shouldUseBulkForQuery(query: string): boolean {
    const upperQuery = query.toUpperCase();
    
    // Use bulk for queries without LIMIT or with high LIMIT
    if (!upperQuery.includes('LIMIT')) {
      return true;
    }
    
    // Extract LIMIT value
    const limitMatch = upperQuery.match(/LIMIT\s+(\d+)/);
    if (limitMatch) {
      const limitValue = parseInt(limitMatch[1]);
      return limitValue > this.BULK_THRESHOLD;
    }
    
    return false;
  }

  /**
   * Execute query with pagination for large result sets
   */
  private static async executePaginatedQuery(conn: Connection, query: string): Promise<any> {
    try {
      console.error('[execute-soql] Using paginated query for large result set');
      
      let allRecords: any[] = [];
      let result = await conn.query(query);
      allRecords = allRecords.concat(result.records);
      
      // Handle pagination if there are more records
      while (!result.done && result.nextRecordsUrl) {
        result = await conn.queryMore(result.nextRecordsUrl);
        allRecords = allRecords.concat(result.records);
      }
      
      return {
        totalSize: allRecords.length,
        done: true,
        records: allRecords
      };
    } catch (error) {
      console.error('[execute-soql] Paginated query failed, falling back to standard query');
      // Fallback to standard query
      const standardResult = await conn.query(query);
      return {
        totalSize: standardResult.totalSize,
        done: standardResult.done,
        records: standardResult.records
      };
    }
  }

  /**
   * Clear metadata cache
   */
  static clearCache(): void {
    MetadataCache.clear();
    console.error('[QueryTools] Metadata cache cleared');
  }
}
