import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import { z } from 'zod';
import Decimal from 'decimal.js';

// Zod schema for Form 1099 validation
const Form1099Schema = z.object({
  type: z.enum(['1099-INT', '1099-DIV', '1099-B', '1099-MISC', '1099-NEC']),
  payerName: z.string(),
  payerTIN: z.string(),
  recipientSSN: z.string(),

  // 1099-INT fields
  interestIncome: z.number().optional(),
  earlyWithdrawalPenalty: z.number().optional(),

  // 1099-DIV fields
  ordinaryDividends: z.number().optional(),
  qualifiedDividends: z.number().optional(),

  // 1099-B fields
  proceeds: z.number().optional(),
  costBasis: z.number().optional(),

  // 1099-MISC fields
  rents: z.number().optional(),
  royalties: z.number().optional(),
  otherIncome: z.number().optional(),

  // 1099-NEC fields
  nonemployeeCompensation: z.number().optional(),

  // Common fields
  federalTaxWithheld: z.number().optional(),
  stateTaxWithheld: z.number().optional(),
  taxYear: z.number(),
});

export class Form1099ImportNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'form1099Import',
    displayName: 'Form 1099 Import',
    group: 'input',
    version: 1,
    description: 'Import and validate Form 1099 data (INT, DIV, B, MISC, NEC)',
    inputs: ['1099 Data'],
    outputs: ['Validated 1099'],
    properties: {
      form1099Type: { type: 'string', default: '1099-INT' },
      validateSSN: { type: 'boolean', default: true },
    },
  };

  async execute(
    _context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);
    const input = this.getFirstInput(inputData);

    // Validate the 1099 data using Zod schema
    const validated = Form1099Schema.parse(input.json);

    // Convert to Decimal for precision
    const form1099Data = {
      type: validated.type,
      payerName: validated.payerName,
      payerTIN: validated.payerTIN,
      recipientSSN: validated.recipientSSN,
      taxYear: validated.taxYear,

      // Interest income (1099-INT)
      interestIncome: validated.interestIncome
        ? new Decimal(validated.interestIncome)
        : undefined,
      earlyWithdrawalPenalty: validated.earlyWithdrawalPenalty
        ? new Decimal(validated.earlyWithdrawalPenalty)
        : undefined,

      // Dividend income (1099-DIV)
      ordinaryDividends: validated.ordinaryDividends
        ? new Decimal(validated.ordinaryDividends)
        : undefined,
      qualifiedDividends: validated.qualifiedDividends
        ? new Decimal(validated.qualifiedDividends)
        : undefined,

      // Capital gains (1099-B)
      proceeds: validated.proceeds
        ? new Decimal(validated.proceeds)
        : undefined,
      costBasis: validated.costBasis
        ? new Decimal(validated.costBasis)
        : undefined,
      capitalGain: validated.proceeds && validated.costBasis
        ? new Decimal(validated.proceeds).minus(new Decimal(validated.costBasis))
        : undefined,

      // Miscellaneous income (1099-MISC)
      rents: validated.rents
        ? new Decimal(validated.rents)
        : undefined,
      royalties: validated.royalties
        ? new Decimal(validated.royalties)
        : undefined,
      otherIncome: validated.otherIncome
        ? new Decimal(validated.otherIncome)
        : undefined,

      // Non-employee compensation (1099-NEC)
      nonemployeeCompensation: validated.nonemployeeCompensation
        ? new Decimal(validated.nonemployeeCompensation)
        : undefined,

      // Withholding
      federalTaxWithheld: validated.federalTaxWithheld
        ? new Decimal(validated.federalTaxWithheld)
        : new Decimal(0),
      stateTaxWithheld: validated.stateTaxWithheld
        ? new Decimal(validated.stateTaxWithheld)
        : new Decimal(0),
    };

    return [this.createOutput(form1099Data)];
  }
}
