import { Connection } from 'jsforce';
import { AuthStrategy, createAuthenticationError } from './types.js';
import { OAuth2Strategy } from './OAuth2Strategy.js';
import { UsernamePasswordStrategy } from './UsernamePasswordStrategy.js';

export class AuthManager {
  private strategies: AuthStrategy[] = [
    new OAuth2Strategy(),
    new UsernamePasswordStrategy()
  ];

  async authenticate(): Promise<Connection> {
    console.error('[AuthManager] Starting authentication process...');
    
    // Try each strategy in priority order
    for (const strategy of this.strategies) {
      if (strategy.canAuthenticate()) {
        console.error(`[AuthManager] Attempting authentication with ${strategy.getName()}`);
        try {
          const connection = await strategy.authenticate();
          console.error(`[AuthManager] Successfully authenticated with ${strategy.getName()}`);
          return connection;
        } catch (error) {
          console.error(`[AuthManager] ${strategy.getName()} authentication failed:`, error);
          // Continue to next strategy
        }
      } else {
        console.error(`[AuthManager] ${strategy.getName()} strategy not available (missing credentials)`);
      }
    }
    
    // If we get here, all strategies failed
    throw createAuthenticationError(
      'All authentication strategies failed. Please check your Salesforce credentials.',
      'AuthManager'
    );
  }

  getAvailableStrategies(): string[] {
    return this.strategies
      .filter(strategy => strategy.canAuthenticate())
      .map(strategy => strategy.getName());
  }
}
