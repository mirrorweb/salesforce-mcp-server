import { Connection } from 'jsforce';
import { AuthStrategy, createAuthenticationError } from './types.js';
import { config } from '../config/environment.js';

export class OAuth2Strategy implements AuthStrategy {
  canAuthenticate(): boolean {
    return !!(config.clientId && config.refreshToken);
  }

  getName(): string {
    return 'OAuth2';
  }

  async authenticate(): Promise<Connection> {
    if (!this.canAuthenticate()) {
      throw createAuthenticationError(
        'OAuth2 authentication requires SF_CLIENT_ID and SF_REFRESH_TOKEN',
        this.getName()
      );
    }

    console.error('[OAuth2Strategy] Attempting OAuth2 authentication...');

    try {
      const conn = new Connection({
        oauth2: {
          clientId: config.clientId!,
          clientSecret: config.clientSecret,
          redirectUri: 'http://localhost:3000/callback' // Not used for refresh token flow
        },
        instanceUrl: config.instanceUrl,
        accessToken: undefined, // Will be set by refresh
        refreshToken: config.refreshToken,
        version: config.apiVersion
      });

      // Test the connection by making a simple query
      await conn.query('SELECT Id FROM Organization LIMIT 1');
      
      console.error('[OAuth2Strategy] OAuth2 authentication successful');
      console.error('[OAuth2Strategy] Instance URL:', conn.instanceUrl);
      console.error('[OAuth2Strategy] API Version:', conn.version);
      
      return conn;
    } catch (error) {
      console.error('[OAuth2Strategy] OAuth2 authentication failed:', error);
      throw createAuthenticationError(
        `OAuth2 authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getName(),
        error instanceof Error ? error : undefined
      );
    }
  }
}
