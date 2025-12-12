/**
 * Environment Configuration
 * Validates and provides type-safe access to environment variables
 */

import { z } from 'zod';

const envSchema = z.object({
  // API Configuration
  VITE_API_URL: z.string().url().optional(),
  VITE_API_TIMEOUT: z.coerce.number().min(1000).max(60000).default(30000),

  // Feature Flags
  VITE_ENABLE_ANALYTICS: z.enum(['true', 'false']).default('false'),
  VITE_ENABLE_PDF_EXPORT: z.enum(['true', 'false']).default('true'),
  VITE_ENABLE_EXCEL_EXPORT: z.enum(['true', 'false']).default('true'),
  VITE_ENABLE_STATE_TAX: z.enum(['true', 'false']).default('false'),

  // Logging
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Application Limits
  VITE_MAX_WORKFLOW_NODES: z.coerce.number().min(10).max(1000).default(100),
  VITE_MAX_FILE_SIZE_MB: z.coerce.number().min(1).max(100).default(10),

  // Development
  VITE_USE_MOCK_DATA: z.enum(['true', 'false']).default('true'),

  // Mode (automatically set by Vite)
  MODE: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Parsed and validated environment configuration
 */
export const env = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
  VITE_ENABLE_PDF_EXPORT: import.meta.env.VITE_ENABLE_PDF_EXPORT,
  VITE_ENABLE_EXCEL_EXPORT: import.meta.env.VITE_ENABLE_EXCEL_EXPORT,
  VITE_ENABLE_STATE_TAX: import.meta.env.VITE_ENABLE_STATE_TAX,
  VITE_LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL,
  VITE_MAX_WORKFLOW_NODES: import.meta.env.VITE_MAX_WORKFLOW_NODES,
  VITE_MAX_FILE_SIZE_MB: import.meta.env.VITE_MAX_FILE_SIZE_MB,
  VITE_USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA,
  MODE: import.meta.env.MODE,
});

/**
 * Type-safe environment config
 */
export type Environment = z.infer<typeof envSchema>;

/**
 * Check if running in development mode
 */
export const isDevelopment = env.MODE === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = env.MODE === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.MODE === 'test';

/**
 * Helper to get feature flag status
 */
export function isFeatureEnabled(feature: keyof Pick<Environment,
  'VITE_ENABLE_ANALYTICS' |
  'VITE_ENABLE_PDF_EXPORT' |
  'VITE_ENABLE_EXCEL_EXPORT' |
  'VITE_ENABLE_STATE_TAX'
>): boolean {
  return env[feature] === 'true';
}
