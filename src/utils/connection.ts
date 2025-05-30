import { Connection } from 'jsforce';
import { AuthManager } from '../auth/AuthManager.js';

export class ConnectionManager {
  private static instance: Connection | null = null;
  private static authManager = new AuthManager();
  private static lastHealthCheck = 0;
  private static readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

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
        // Test existing connection
        await this.instance.query('SELECT Id FROM Organization LIMIT 1');
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

  private static setupConnectionHandlers(connection: Connection): void {
    // Handle token refresh events
    connection.on('refresh', (accessToken: string) => {
      console.error('[ConnectionManager] Access token refreshed');
      this.lastHealthCheck = Date.now();
    });

    // Handle connection errors
    connection.on('error', (error: Error) => {
      console.error('[ConnectionManager] Connection error:', error);
      this.instance = null; // Force reconnection on next request
    });
  }

  static async closeConnection(): Promise<void> {
    if (this.instance) {
      console.error('[ConnectionManager] Closing Salesforce connection...');
      // jsforce doesn't have an explicit close method, just clear the instance
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
