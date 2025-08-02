import { Connection } from 'jsforce';
import { AuthStrategy, createAuthenticationError } from './types.js';
import { config } from '../config/environment.js';

export class OAuth2Strategy implements AuthStrategy {
  private retryCount = 0;
  private maxRetries = 1;

  canAuthenticate(): boolean {
    return !!(config.clientId && config.refreshToken && config.instanceUrl);
  }

  getName(): string {
    return 'OAuth2';
  }

  async authenticate(): Promise<Connection> {
    if (!this.canAuthenticate()) {
      const missingVars = [];
      if (!config.clientId) missingVars.push('SF_CLIENT_ID');
      if (!config.refreshToken) missingVars.push('SF_REFRESH_TOKEN');
      if (!config.instanceUrl) missingVars.push('SF_INSTANCE_URL');
      
      throw createAuthenticationError(
        `OAuth2 authentication requires: ${missingVars.join(', ')}. ` +
        `Please check your environment variables and see README.md for setup instructions.`,
        this.getName()
      );
    }

    console.error('[OAuth2Strategy] Attempting OAuth2 authentication...');
    console.error('[OAuth2Strategy] Instance URL:', config.instanceUrl);
    console.error('[OAuth2Strategy] Client ID:', config.clientId?.substring(0, 8) + '...');

    return await this.authenticateWithRetry();
  }

  private async authenticateWithRetry(): Promise<Connection> {
    try {
      const conn = new Connection({
        oauth2: {
          clientId: config.clientId!,
          clientSecret: config.clientSecret,
          redirectUri: 'http://localhost:3000/callback'
        },
        instanceUrl: config.instanceUrl,
        accessToken: undefined,
        refreshToken: config.refreshToken,
        version: config.apiVersion
      });

      // Set up refresh token error handling
      conn.on('refresh', (accessToken: string) => {
        console.error('[OAuth2Strategy] Successfully refreshed access token');
        this.retryCount = 0; // Reset retry count on successful refresh
      });

      // Test the connection by making a simple query with retry logic
      await this.testConnectionWithRetry(conn);
      
      console.error('[OAuth2Strategy] OAuth2 authentication successful');
      console.error('[OAuth2Strategy] Instance URL:', conn.instanceUrl);
      console.error('[OAuth2Strategy] API Version:', conn.version);
      
      return conn;
    } catch (error) {
      console.error('[OAuth2Strategy] OAuth2 authentication failed:', error);
      throw this.createDetailedAuthError(error);
    }
  }

  private async testConnectionWithRetry(conn: Connection): Promise<void> {
    try {
      await conn.query('SELECT Id FROM Organization LIMIT 1');
    } catch (error: any) {
      // Check if this is a token-related error and we haven't exceeded retry limit
      if (this.isTokenError(error) && this.retryCount < this.maxRetries) {
        console.error(`[OAuth2Strategy] Token error detected, attempting refresh retry ${this.retryCount + 1}/${this.maxRetries}`);
        this.retryCount++;
        
        try {
          // Force token refresh
          await conn.oauth2.refreshToken(conn.refreshToken!);
          // Retry the test query
          await conn.query('SELECT Id FROM Organization LIMIT 1');
          console.error('[OAuth2Strategy] Successfully recovered from token error');
          return;
        } catch (retryError) {
          console.error('[OAuth2Strategy] Token refresh retry failed:', retryError);
          throw retryError;
        }
      }
      throw error;
    }
  }

  private isTokenError(error: any): boolean {
    const tokenErrorPatterns = [
      'INVALID_SESSION_ID',
      'SESSION_NOT_FOUND',
      'invalid_grant',
      'expired access/refresh token',
      'authentication failure'
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.errorCode?.toLowerCase() || '';
    
    return tokenErrorPatterns.some(pattern => 
      errorMessage.includes(pattern.toLowerCase()) || 
      errorCode.includes(pattern.toLowerCase())
    );
  }

  private createDetailedAuthError(error: any): Error {
    let message = 'OAuth2 authentication failed';
    let userAction = '';

    if (this.isTokenError(error)) {
      message = 'OAuth2 token error - refresh token may be invalid or expired';
      userAction = 'Please re-authorize your Connected App to generate a new refresh token. ' +
                  'Follow the OAuth2 setup instructions in README.md';
    } else if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED')) {
      message = 'Network error - unable to connect to Salesforce instance';
      userAction = 'Please check your SF_INSTANCE_URL and network connectivity';
    } else if (error?.message?.includes('invalid_client')) {
      message = 'Invalid client credentials - client ID or secret is incorrect';
      userAction = 'Please verify your SF_CLIENT_ID and SF_CLIENT_SECRET from your Connected App';
    } else if (error?.message?.includes('redirect_uri_mismatch')) {
      message = 'OAuth2 configuration error - redirect URI mismatch';
      userAction = 'Please ensure your Connected App callback URL is configured correctly';
    } else {
      message = `OAuth2 authentication failed: ${error?.message || 'Unknown error'}`;
      userAction = 'Please check your OAuth2 configuration and Connected App settings';
    }

    const detailedMessage = `${message}. ${userAction}`;
    console.error(`[OAuth2Strategy] Detailed error: ${detailedMessage}`);
    
    return createAuthenticationError(
      detailedMessage,
      this.getName(),
      error instanceof Error ? error : undefined
    );
  }
}
