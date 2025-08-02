import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SalesforceConfig {
  // OAuth2 Configuration (Required)
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  instanceUrl?: string;
  
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
  
  // Optional Configuration
  apiVersion: process.env.SF_API_VERSION || '59.0',
  timeout: parseInt(process.env.SF_TIMEOUT || '120000'),
  maxRequestSize: parseInt(process.env.SF_MAX_REQUEST_SIZE || '10485760'),
  
  // Bulk Operation Thresholds
  bulkQueryThreshold: parseInt(process.env.SF_BULK_QUERY_THRESHOLD || '2000'),
  bulkDmlThreshold: parseInt(process.env.SF_BULK_DML_THRESHOLD || '200')
};

export function validateConfig(): void {
  // Check for deprecated username/password environment variables
  const deprecatedVars = ['SF_USERNAME', 'SF_PASSWORD', 'SF_SECURITY_TOKEN', 'SF_LOGIN_URL'];
  const foundDeprecatedVars = deprecatedVars.filter(varName => process.env[varName]);
  
  if (foundDeprecatedVars.length > 0) {
    throw new Error(
      `Username/password authentication is deprecated for security reasons. ` +
      `Found deprecated environment variables: ${foundDeprecatedVars.join(', ')}. ` +
      `Please use OAuth2 authentication instead with SF_CLIENT_ID, SF_CLIENT_SECRET, SF_REFRESH_TOKEN, and SF_INSTANCE_URL. ` +
      `See README.md for setup instructions.`
    );
  }
  
  // Validate required OAuth2 configuration
  const hasOAuth2 = config.clientId && config.refreshToken && config.instanceUrl;
  
  if (!hasOAuth2) {
    const missingVars = [];
    if (!config.clientId) missingVars.push('SF_CLIENT_ID');
    if (!config.refreshToken) missingVars.push('SF_REFRESH_TOKEN');
    if (!config.instanceUrl) missingVars.push('SF_INSTANCE_URL');
    
    throw new Error(
      `OAuth2 authentication configuration incomplete. ` +
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `See README.md for setup instructions.`
    );
  }
  
  console.error('[Config] OAuth2 authentication configured successfully');
  console.error('[Config] Instance URL:', config.instanceUrl);
  console.error('[Config] API Version:', config.apiVersion);
}
