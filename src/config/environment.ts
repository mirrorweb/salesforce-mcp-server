import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SalesforceConfig {
  // OAuth2 Configuration
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  instanceUrl?: string;
  
  // Username/Password Configuration
  username?: string;
  password?: string;
  securityToken?: string;
  loginUrl?: string;
  
  // Optional Configuration
  apiVersion?: string;
  timeout?: number;
  maxRequestSize?: number;
  
  // Bulk Operation Thresholds
  bulkQueryThreshold?: number;
  bulkDmlThreshold?: number;
}

export const config: SalesforceConfig = {
  // OAuth2 Configuration
  clientId: process.env.SF_CLIENT_ID,
  clientSecret: process.env.SF_CLIENT_SECRET,
  refreshToken: process.env.SF_REFRESH_TOKEN,
  instanceUrl: process.env.SF_INSTANCE_URL,
  
  // Username/Password Configuration
  username: process.env.SF_USERNAME,
  password: process.env.SF_PASSWORD,
  securityToken: process.env.SF_SECURITY_TOKEN,
  loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
  
  // Optional Configuration
  apiVersion: process.env.SF_API_VERSION || '59.0',
  timeout: parseInt(process.env.SF_TIMEOUT || '120000'),
  maxRequestSize: parseInt(process.env.SF_MAX_REQUEST_SIZE || '10485760'),
  
  // Bulk Operation Thresholds
  bulkQueryThreshold: parseInt(process.env.SF_BULK_QUERY_THRESHOLD || '2000'),
  bulkDmlThreshold: parseInt(process.env.SF_BULK_DML_THRESHOLD || '200')
};

export function validateConfig(): void {
  const hasOAuth2 = config.clientId && config.refreshToken;
  const hasUsernamePassword = config.username && config.password;
  
  if (!hasOAuth2 && !hasUsernamePassword) {
    throw new Error(
      'No valid Salesforce authentication configuration found. ' +
      'Please provide either OAuth2 credentials (SF_CLIENT_ID, SF_REFRESH_TOKEN) ' +
      'or username/password credentials (SF_USERNAME, SF_PASSWORD)'
    );
  }
  
  console.error('[Config] Authentication method available:', hasOAuth2 ? 'OAuth2' : 'Username/Password');
}
