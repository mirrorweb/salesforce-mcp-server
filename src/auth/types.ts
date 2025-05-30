import { Connection } from 'jsforce';

export interface AuthStrategy {
  canAuthenticate(): boolean;
  authenticate(): Promise<Connection>;
  getName(): string;
}

export interface AuthenticationError extends Error {
  name: 'AuthenticationError';
  strategy?: string;
  originalError?: Error;
}

export function createAuthenticationError(
  message: string, 
  strategy?: string, 
  originalError?: Error
): AuthenticationError {
  const error = new Error(message) as AuthenticationError;
  error.name = 'AuthenticationError';
  error.strategy = strategy;
  error.originalError = originalError;
  return error;
}
