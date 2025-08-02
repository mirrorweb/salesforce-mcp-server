import { Connection } from 'jsforce';
import { AuthStrategy, createAuthenticationError } from './types.js';
import { OAuth2Strategy } from './OAuth2Strategy.js';

export class AuthManager {
  private strategy: AuthStrategy = new OAuth2Strategy();

  async authenticate(): Promise<Connection> {
    console.error('[AuthManager] Starting OAuth2 authentication...');
    
    if (!this.strategy.canAuthenticate()) {
      throw createAuthenticationError(
        'OAuth2 authentication not configured. Please ensure SF_CLIENT_ID, SF_REFRESH_TOKEN, and SF_INSTANCE_URL environment variables are set. See README.md for setup instructions.',
        'AuthManager'
      );
    }

    try {
      console.error(`[AuthManager] Attempting authentication with ${this.strategy.getName()}`);
      const connection = await this.strategy.authenticate();
      console.error(`[AuthManager] Successfully authenticated with ${this.strategy.getName()}`);
      return connection;
    } catch (error) {
      console.error(`[AuthManager] ${this.strategy.getName()} authentication failed:`, error);
      throw error; // Re-throw the detailed error from OAuth2Strategy
    }
  }

  getAvailableStrategies(): string[] {
    return this.strategy.canAuthenticate() ? [this.strategy.getName()] : [];
  }
}
