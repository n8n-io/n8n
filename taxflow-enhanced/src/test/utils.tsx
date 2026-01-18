/**
 * Test utilities for React components
 * Provides custom render functions and test helpers
 */

import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import Decimal from 'decimal.js';

/**
 * Custom render function that includes common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    return <ReactFlowProvider>{children}</ReactFlowProvider>;
  };

  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Create mock taxpayer info for tests
 */
export function createMockTaxpayerInfo() {
  return {
    firstName: 'Test',
    lastName: 'User',
    ssn: '000-00-0000',
  };
}

/**
 * Create mock W-2 data for tests
 */
export function createMockW2Data() {
  return {
    employer: 'Test Employer Inc.',
    employerEIN: '12-3456789',
    employeeSSN: '000-00-0000',
    wages: new Decimal(75000),
    federalIncomeTaxWithheld: new Decimal(8500),
    socialSecurityWages: new Decimal(75000),
    socialSecurityTaxWithheld: new Decimal(4650),
    medicareWages: new Decimal(75000),
    medicareTaxWithheld: new Decimal(1087.5),
  };
}

/**
 * Create mock 1099 data for tests
 */
export function createMock1099Data() {
  return {
    formType: '1099-INT' as const,
    payer: 'Test Bank',
    payerEIN: '98-7654321',
    recipientSSN: '000-00-0000',
    amount: new Decimal(500),
    federalIncomeTaxWithheld: new Decimal(0),
  };
}

/**
 * Create mock tax return result for tests
 */
export function createMockTaxReturn() {
  return {
    workflowId: 'test-workflow',
    taxYear: 2024,
    filingStatus: 'single' as const,
    taxpayerInfo: createMockTaxpayerInfo(),
    income: {
      wages: new Decimal(75000),
      businessIncome: new Decimal(0),
      capitalGains: new Decimal(0),
      otherIncome: new Decimal(500),
      totalIncome: new Decimal(75500),
    },
    adjustments: [],
    agi: new Decimal(75500),
    deductions: {
      type: 'standard' as const,
      amount: new Decimal(14600),
    },
    taxableIncome: new Decimal(60900),
    tax: {
      taxableIncome: new Decimal(60900),
      regularTax: new Decimal(8823),
      alternativeMinimumTax: new Decimal(0),
      totalTax: new Decimal(8823),
      effectiveRate: new Decimal(11.68),
      marginalRate: new Decimal(22),
    },
    credits: [],
    refundOrOwed: new Decimal(-323),
    schedules: new Map(),
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: '1.0.0',
      completionStatus: 'draft' as const,
    },
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock execution context for tax nodes
 */
export function createMockExecutionContext() {
  return {
    workflowId: 'test-workflow',
    taxYear: 2024,
    filingStatus: 'single' as const,
    taxpayerInfo: createMockTaxpayerInfo(),
    getNodeData: (_nodeId: string) => undefined as any,
  };
}

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
