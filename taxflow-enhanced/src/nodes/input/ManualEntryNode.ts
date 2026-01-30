import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';

export class ManualEntryNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'manualEntry',
    displayName: 'Manual Entry',
    group: 'input',
    version: 1,
    description: 'Manually enter tax data',
    inputs: [],
    outputs: ['Data'],
    properties: {
      data: { type: 'object', default: {} },
    },
  };

  async execute(
    context: TaxExecutionContext,
    _inputData: TaxData[][]
  ): Promise<TaxData[]> {
    // This node doesn't require input - it's a starting node
    // For testing purposes, we'll return sample W-2 data
    const sampleW2Data = {
      type: 'w2_input',
      employerName: 'Acme Corporation',
      employerEIN: '12-3456789',
      employeeSSN: context.taxpayerInfo.ssn,
      wages: 75000,
      federalTaxWithheld: 12000,
      socialSecurityWages: 75000,
      socialSecurityTaxWithheld: 4650,
      medicareWages: 75000,
      medicareTaxWithheld: 1087.50,
      stateWages: 75000,
      stateTaxWithheld: 3750,
      localWages: 0,
      localTaxWithheld: 0,
      taxYear: context.taxYear,
    };

    return [this.createOutput(sampleW2Data)];
  }
}
