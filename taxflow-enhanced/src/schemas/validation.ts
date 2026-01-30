/**
 * Zod validation schemas for TaxFlow Enhanced
 * Provides runtime type validation for all user inputs
 */

import { z } from 'zod';

/**
 * SSN validation - accepts format XXX-XX-XXXX or XXXXXXXXX
 */
export const ssnSchema = z
  .string()
  .refine(
    (val) => /^\d{3}-\d{2}-\d{4}$/.test(val) || /^\d{9}$/.test(val),
    {
      message: 'SSN must be in format XXX-XX-XXXX or 9 digits',
    }
  );

/**
 * Taxpayer information schema
 */
export const taxpayerInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  ssn: ssnSchema,
});

/**
 * Filing status schema
 */
export const filingStatusSchema = z.enum([
  'single',
  'married_joint',
  'married_separate',
  'head_of_household',
]);

/**
 * Tax year schema - validates reasonable tax year range
 */
export const taxYearSchema = z
  .number()
  .int()
  .min(2020, 'Tax year must be 2020 or later')
  .max(2030, 'Tax year must be 2030 or earlier');

/**
 * Currency amount schema - validates positive decimal values
 */
export const currencySchema = z
  .number()
  .nonnegative('Amount must be non-negative')
  .finite('Amount must be a finite number')
  .refine((val) => Number.isFinite(val), {
    message: 'Amount must be a valid number',
  });

/**
 * Percentage schema - validates 0-100 range
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100');

/**
 * W-2 form data schema
 */
export const w2Schema = z.object({
  employer: z.string().min(1, 'Employer name is required'),
  employerEIN: z
    .string()
    .regex(/^\d{2}-\d{7}$/, 'EIN must be in format XX-XXXXXXX'),
  employeeSSN: ssnSchema,
  wages: currencySchema,
  federalIncomeTaxWithheld: currencySchema,
  socialSecurityWages: currencySchema,
  socialSecurityTaxWithheld: currencySchema,
  medicareWages: currencySchema,
  medicareTaxWithheld: currencySchema,
});

/**
 * 1099 form data schema
 */
export const form1099Schema = z.object({
  formType: z.enum(['1099-INT', '1099-DIV', '1099-B', '1099-MISC', '1099-NEC']),
  payer: z.string().min(1, 'Payer name is required'),
  payerEIN: z
    .string()
    .regex(/^\d{2}-\d{7}$/, 'EIN must be in format XX-XXXXXXX'),
  recipientSSN: ssnSchema,
  amount: currencySchema,
  federalIncomeTaxWithheld: currencySchema.optional(),
});

/**
 * Deduction item schema
 */
export const deductionSchema = z.object({
  category: z.string().min(1, 'Deduction category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: currencySchema,
  documentation: z.boolean().optional(),
});

/**
 * Business income/expense schema
 */
export const businessItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  amount: currencySchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

/**
 * Workflow settings schema
 */
export const workflowSettingsSchema = z.object({
  taxYear: taxYearSchema,
  filingStatus: filingStatusSchema,
  taxpayerInfo: taxpayerInfoSchema,
});

/**
 * Node configuration schema
 */
export const nodeConfigSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  type: z.string().min(1, 'Node type is required'),
  label: z.string().min(1, 'Node label is required'),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Connection schema
 */
export const connectionSchema = z.object({
  sourceNode: z.string().min(1, 'Source node is required'),
  sourceOutput: z.number().int().nonnegative(),
  targetNode: z.string().min(1, 'Target node is required'),
  targetInput: z.number().int().nonnegative(),
});

/**
 * Manual entry data schema
 */
export const manualEntrySchema = z.object({
  incomeType: z.enum(['wages', 'business', 'investment', 'other']),
  description: z.string().min(1, 'Description is required'),
  amount: currencySchema,
  source: z.string().optional(),
});

/**
 * Excel import mapping schema
 */
export const excelImportMappingSchema = z.object({
  sheet: z.string().min(1, 'Sheet name is required'),
  startRow: z.number().int().positive('Start row must be positive'),
  columnMapping: z.record(z.string(), z.string()),
});

/**
 * Validate and sanitize user input
 * Returns validated data or throws Error with validation details
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};

    result.error.issues.forEach((err: z.ZodIssue) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    throw new Error(
      `Validation failed: ${JSON.stringify(fieldErrors, null, 2)}`
    );
  }

  return result.data;
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate currency string and convert to number
 */
export function parseCurrency(input: string): number {
  // Remove currency symbols and commas
  const cleaned = input.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);

  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Invalid currency amount');
  }

  return num;
}

/**
 * Validate and format SSN
 */
export function formatSSN(input: string): string {
  // Remove all non-digits
  const digits = input.replace(/\D/g, '');

  if (digits.length !== 9) {
    throw new Error('SSN must be 9 digits');
  }

  // Format as XXX-XX-XXXX
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Validate and format EIN
 */
export function formatEIN(input: string): string {
  // Remove all non-digits
  const digits = input.replace(/\D/g, '');

  if (digits.length !== 9) {
    throw new Error('EIN must be 9 digits');
  }

  // Format as XX-XXXXXXX
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}
