import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';
import { z } from 'zod';

const W2Schema = z.object({
  employerName: z.string(),
  employerEIN: z.string(),
  employeeSSN: z.string(),
  wages: z.number(),
  federalTaxWithheld: z.number(),
  socialSecurityWages: z.number(),
  socialSecurityTaxWithheld: z.number(),
  medicareWages: z.number(),
  medicareTaxWithheld: z.number(),
  stateWages: z.number().optional(),
  stateTaxWithheld: z.number().optional(),
});

export class W2ImportNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'w2Import',
    displayName: 'W-2 Import',
    group: 'input',
    version: 1,
    description: 'Import W-2 wage and tax statement data',
    inputs: ['W-2 Data'],
    outputs: ['W-2 Record'],
    properties: {
      validateEIN: { type: 'boolean', default: true },
      validateSSN: { type: 'boolean', default: true },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    const input = inputData[0][0].json;
    const validated = W2Schema.parse(input);

    const w2Data = {
      type: 'w2',
      taxYear: context.taxYear,
      employerName: validated.employerName,
      employerEIN: validated.employerEIN,
      employeeSSN: validated.employeeSSN,
      wages: new Decimal(validated.wages),
      federalTaxWithheld: new Decimal(validated.federalTaxWithheld),
      socialSecurityWages: new Decimal(validated.socialSecurityWages),
      socialSecurityTaxWithheld: new Decimal(validated.socialSecurityTaxWithheld),
      medicareWages: new Decimal(validated.medicareWages),
      medicareTaxWithheld: new Decimal(validated.medicareTaxWithheld),
      stateWages: validated.stateWages ? new Decimal(validated.stateWages) : undefined,
      stateTaxWithheld: validated.stateTaxWithheld ? new Decimal(validated.stateTaxWithheld) : undefined,
    };

    return [this.createOutput(w2Data)];
  }
}
