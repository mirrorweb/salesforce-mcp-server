import { Connection } from 'jsforce';
import { AuthManager } from '../auth/AuthManager.js';

export class ConnectionManager {
  private static instance: Connection | null = null;
  private static authManager = new AuthManager();
  private static lastHealthCheck = 0;
  private static readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

  static async getConnection(): Promise<Connection> {
    if (!this.instance || this.needsHealthCheck()) {
      await this.ensureHealthyConnection();
    }
    return this.instance!;
  }

  private static needsHealthCheck(): boolean {
    return Date.now() - this.lastHealthCheck > this.HEALTH_CHECK_INTERVAL;
  }

  private static async ensureHealthyConnection(): Promise<void> {
    try {
      if (this.instance) {
        // Test existing connection with OAuth retry logic
        await this.testConnectionWithRetry();
        this.lastHealthCheck = Date.now();
        console.error('[ConnectionManager] Connection health check passed');
        return;
      }
    } catch (error) {
      console.error('[ConnectionManager] Health check failed, reconnecting...', error);
      this.instance = null;
    }

    // Create new connection
    console.error('[ConnectionManager] Creating new Salesforce connection...');
    this.instance = await this.authManager.authenticate();
    this.lastHealthCheck = Date.now();
    
    // Set up connection event handlers
    this.setupConnectionHandlers(this.instance);
    
    console.error('[ConnectionManager] Connection established successfully');
  }

  private static async testConnectionWithRetry(): Promise<void> {
    if (!this.instance) {
      throw new Error('No connection instance available');
    }

    try {
      await this.instance.query('SELECT Id FROM Organization LIMIT 1');
    } catch (error: any) {
      // Check if this is an OAuth error that might be recoverable
      if (this.isOAuthError(error)) {
        console.error('[ConnectionManager] OAuth error during health check, attempting token refresh...');
        
        try {
          // Force a token refresh and retry
          await this.instance.oauth2.refreshToken(this.instance.refreshToken!);
          await this.instance.query('SELECT Id FROM Organization LIMIT 1');
          console.error('[ConnectionManager] Successfully recovered from OAuth error');
          return;
        } catch (refreshError) {
          console.error('[ConnectionManager] Token refresh failed during health check:', refreshError);
          throw refreshError;
        }
      }
      throw error;
    }
  }

  private static setupConnectionHandlers(connection: Connection): void {
    // Handle token refresh events
    connection.on('refresh', (accessToken: string) => {
      console.error('[ConnectionManager] Access token refreshed successfully');
      this.lastHealthCheck = Date.now();
    });

    // Handle connection errors with OAuth-specific handling
    connection.on('error', (error: Error) => {
      console.error('[ConnectionManager] Connection error:', error);
      
      // Check if this is an OAuth-related error
      const isOAuthError = this.isOAuthError(error);
      if (isOAuthError) {
        console.error('[ConnectionManager] OAuth error detected - invalidating connection for refresh');
      }
      
      this.instance = null;
      this.lastHealthCheck = 0;
    });
  }

  private static isOAuthError(error: Error): boolean {
    const oauthErrorPatterns = [
      'INVALID_SESSION_ID',
      'SESSION_NOT_FOUND', 
      'invalid_grant',
      'expired access/refresh token',
      'authentication failure',
      'invalid_client'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return oauthErrorPatterns.some(pattern => errorMessage.includes(pattern.toLowerCase()));
  }

  static async closeConnection(): Promise<void> {
    if (this.instance) {
      console.error('[ConnectionManager] Closing Salesforce connection...');
      this.instance = null;
      this.lastHealthCheck = 0;
    }
  }

  static getConnectionInfo(): { connected: boolean; lastHealthCheck: Date | null } {
    return {
      connected: !!this.instance,
      lastHealthCheck: this.lastHealthCheck ? new Date(this.lastHealthCheck) : null
    };
  }
}
