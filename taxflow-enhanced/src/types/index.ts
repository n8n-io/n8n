/**
 * Comprehensive type definitions for TaxFlow Enhanced
 * Centralizes all shared types across the application
 */

import type Decimal from 'decimal.js';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Filing status types recognized by IRS
 */
export type FilingStatus =
  | 'single'
  | 'married_joint'
  | 'married_separate'
  | 'head_of_household';

/**
 * Node execution status
 */
export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Node category/group
 */
export type NodeGroup = 'input' | 'calculation' | 'forms' | 'validation' | 'output';

/**
 * Tax form types
 */
export type TaxFormType =
  | 'form1040'
  | 'scheduleA'
  | 'scheduleB'
  | 'scheduleC'
  | 'scheduleD'
  | 'scheduleSE'
  | 'form8949'
  | 'form1099-INT'
  | 'form1099-DIV'
  | 'form1099-B'
  | 'form1099-MISC'
  | 'form1099-NEC'
  | 'w2';

// ============================================================================
// Taxpayer Information
// ============================================================================

/**
 * Taxpayer personal information
 */
export interface TaxpayerInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth?: string;
  address?: Address;
}

/**
 * Address information
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

// ============================================================================
// Income Types
// ============================================================================

/**
 * W-2 wage and tax statement
 */
export interface W2Data {
  employer: string;
  employerEIN: string;
  employeeSSN: string;
  wages: Decimal;
  federalIncomeTaxWithheld: Decimal;
  socialSecurityWages: Decimal;
  socialSecurityTaxWithheld: Decimal;
  medicareWages: Decimal;
  medicareTaxWithheld: Decimal;
}

/**
 * 1099 form types and data
 */
export interface Form1099Data {
  formType: '1099-INT' | '1099-DIV' | '1099-B' | '1099-MISC' | '1099-NEC';
  payer: string;
  payerEIN: string;
  recipientSSN: string;
  amount: Decimal;
  federalIncomeTaxWithheld?: Decimal;
}

/**
 * Business income/expense item
 */
export interface BusinessItem {
  description: string;
  category: string;
  amount: Decimal;
  date: string;
}

// ============================================================================
// Deductions and Credits
// ============================================================================

/**
 * Deduction item
 */
export interface DeductionItem {
  category: string;
  description: string;
  amount: Decimal;
  documentation?: boolean;
}

/**
 * Deduction type
 */
export type DeductionType = 'standard' | 'itemized';

/**
 * Itemized deductions
 */
export interface ItemizedDeductions {
  medicalExpenses: Decimal;
  stateTaxes: Decimal;
  localTaxes: Decimal;
  realEstateTaxes: Decimal;
  mortgageInterest: Decimal;
  charitableContributions: Decimal;
  other: Decimal;
  total: Decimal;
}

/**
 * Tax credit types
 */
export type TaxCreditType =
  | 'childTaxCredit'
  | 'earnedIncomeCredit'
  | 'educationCredit'
  | 'retirementSavingsCredit'
  | 'other';

/**
 * Tax credit data
 */
export interface TaxCredit {
  type: TaxCreditType;
  amount: Decimal;
  description?: string;
}

// ============================================================================
// Tax Calculation Results
// ============================================================================

/**
 * Income summary
 */
export interface IncomeSummary {
  wages: Decimal;
  businessIncome: Decimal;
  capitalGains: Decimal;
  otherIncome: Decimal;
  totalIncome: Decimal;
}

/**
 * Deduction summary
 */
export interface DeductionSummary {
  type: DeductionType;
  amount: Decimal;
  details?: ItemizedDeductions;
}

/**
 * Tax calculation result
 */
export interface TaxCalculation {
  taxableIncome: Decimal;
  regularTax: Decimal;
  alternativeMinimumTax: Decimal;
  totalTax: Decimal;
  effectiveRate: Decimal;
  marginalRate: Decimal;
}

/**
 * Self-employment tax data
 */
export interface SelfEmploymentTax {
  netSelfEmploymentIncome: Decimal;
  socialSecurityTax: Decimal;
  medicareTax: Decimal;
  additionalMedicareTax: Decimal;
  totalSETax: Decimal;
  deductibleSETax: Decimal;
}

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  taxYear: number;
  filingStatus: FilingStatus;
  taxpayerInfo: TaxpayerInfo;
  spouseInfo?: TaxpayerInfo;
}

/**
 * Node connection
 */
export interface NodeConnection {
  sourceNode: string;
  sourceOutput: number;
  targetNode: string;
  targetInput: number;
}

/**
 * Node configuration
 */
export interface NodeConfig {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

// ============================================================================
// Complete Tax Return
// ============================================================================

/**
 * Complete tax return data structure
 */
export interface TaxReturn {
  workflowId: string;
  taxYear: number;
  filingStatus: FilingStatus;
  taxpayerInfo: TaxpayerInfo;
  spouseInfo?: TaxpayerInfo;
  income: IncomeSummary;
  adjustments: Array<{ type: string; amount: Decimal }>;
  agi: Decimal;
  deductions: DeductionSummary;
  taxableIncome: Decimal;
  tax: TaxCalculation;
  credits: TaxCredit[];
  selfEmploymentTax?: SelfEmploymentTax;
  refundOrOwed: Decimal;
  schedules: Map<string, unknown>;
  metadata: TaxReturnMetadata;
}

/**
 * Tax return metadata
 */
export interface TaxReturnMetadata {
  createdAt: Date;
  updatedAt: Date;
  version: string;
  completionStatus: 'draft' | 'review' | 'finalized';
}

// ============================================================================
// UI Types
// ============================================================================

/**
 * Tax node data for React Flow
 */
export interface TaxNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  group: NodeGroup;
  status: NodeStatus;
  description: string;
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  agi: Decimal | null;
  deductions: Decimal | null;
  taxableIncome: Decimal | null;
  totalTax: Decimal | null;
  refundOrOwed: Decimal | null;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys of type T that have value type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
