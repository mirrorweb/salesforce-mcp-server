import { Connection } from 'jsforce';
import { AuthStrategy, createAuthenticationError } from './types.js';
import { config } from '../config/environment.js';

export class UsernamePasswordStrategy implements AuthStrategy {
  canAuthenticate(): boolean {
    return !!(config.username && config.password);
  }

  getName(): string {
    return 'Username/Password';
  }

  async authenticate(): Promise<Connection> {
    if (!this.canAuthenticate()) {
      throw createAuthenticationError(
        'Username/Password authentication requires SF_USERNAME and SF_PASSWORD',
        this.getName()
      );
    }

    console.error('[UsernamePasswordStrategy] Attempting username/password authentication...');
    console.error('[UsernamePasswordStrategy] Login URL:', config.loginUrl);
    console.error('[UsernamePasswordStrategy] Username:', config.username);

    try {
      const conn = new Connection({
        loginUrl: config.loginUrl,
        version: config.apiVersion
      });

      // Combine password with security token if provided
      const passwordWithToken = config.securityToken 
        ? config.password + config.securityToken
        : config.password;

      const userInfo = await conn.login(config.username!, passwordWithToken!);
      
      console.error('[UsernamePasswordStrategy] Authentication successful');
      console.error('[UsernamePasswordStrategy] User ID:', userInfo.id);
      console.error('[UsernamePasswordStrategy] Org ID:', userInfo.organizationId);
      console.error('[UsernamePasswordStrategy] Instance URL:', conn.instanceUrl);
      console.error('[UsernamePasswordStrategy] API Version:', conn.version);
      
      return conn;
    } catch (error) {
      console.error('[UsernamePasswordStrategy] Authentication failed:', error);
      throw createAuthenticationError(
        `Username/Password authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getName(),
        error instanceof Error ? error : undefined
      );
    }
  }
}
