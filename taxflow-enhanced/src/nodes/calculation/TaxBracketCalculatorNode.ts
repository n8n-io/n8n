import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';
import { IRSRulesEngine } from '../../core/rules/IRSRulesEngine';

export class TaxBracketCalculatorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'taxBracketCalculator',
    displayName: 'Tax Bracket Calculator',
    group: 'calculation',
    version: 1,
    description: 'Calculate federal income tax using 2024 tax brackets',
    inputs: ['Taxable Income'],
    outputs: ['Tax Calculation'],
    properties: {
      showBreakdown: { type: 'boolean', default: true },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    const input = this.getFirstInput(inputData);
    const taxableIncome = input.json.taxableIncome instanceof Decimal
      ? input.json.taxableIncome
      : new Decimal(input.json.taxableIncome || 0);

    const totalTax = IRSRulesEngine.calculateTax(taxableIncome, context.filingStatus);

    const effectiveRate = taxableIncome.gt(0)
      ? totalTax.div(taxableIncome).times(100)
      : new Decimal(0);

    const result = {
      taxableIncome,
      totalTax,
      effectiveRate: effectiveRate.toDecimalPlaces(2),
      filingStatus: context.filingStatus,
      taxYear: context.taxYear,
    };

    return [this.createOutput(result)];
  }
}
