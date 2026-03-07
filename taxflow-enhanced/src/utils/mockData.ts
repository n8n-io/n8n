/**
 * Mock data generators for development and testing
 * NEVER use real PII data in this file
 */

import type { WorkflowSettings } from '../core/workflow/TaxWorkflow';

type TaxpayerInfo = WorkflowSettings['taxpayerInfo'];

/**
 * Generate a mock SSN in format XXX-XX-XXXX
 * Uses 000-00-0000 to clearly indicate this is mock data
 */
export function generateMockSSN(): string {
  return '000-00-0000';
}

/**
 * Generate mock taxpayer information for development
 */
export function generateMockTaxpayerInfo(): TaxpayerInfo {
  return {
    firstName: 'Test',
    lastName: 'User',
    ssn: generateMockSSN(),
  };
}

/**
 * Get taxpayer info from environment or use mock data
 */
export function getTaxpayerInfo(): TaxpayerInfo {
  // In production, this would come from authenticated user session
  // For development, use mock data
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return generateMockTaxpayerInfo();
  }

  // Production path would integrate with auth system
  throw new Error(
    'Taxpayer info must come from authenticated session in production'
  );
}
