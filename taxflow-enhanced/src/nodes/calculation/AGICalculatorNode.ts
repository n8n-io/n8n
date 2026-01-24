import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class AGICalculatorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'agiCalculator',
    displayName: 'AGI Calculator',
    group: 'calculation',
    version: 1,
    description: 'Calculate Adjusted Gross Income (AGI)',
    inputs: ['Income Data'],
    outputs: ['AGI Data'],
    properties: {},
  };

  async execute(
    _context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    let totalIncome = new Decimal(0);
    let totalAdjustments = new Decimal(0);
    const incomeBreakdown: Record<string, Decimal> = {
      wages: new Decimal(0),
      interest: new Decimal(0),
      dividends: new Decimal(0),
      businessIncome: new Decimal(0),
      capitalGains: new Decimal(0),
      other: new Decimal(0),
    };

    // Aggregate income from all input items
    for (const inputArray of inputData) {
      for (const item of inputArray) {
        const data = item.json;

        // Handle W-2 data
        if (data.type === 'w2' && data.wages) {
          const wages = data.wages instanceof Decimal ? data.wages : new Decimal(data.wages);
          incomeBreakdown.wages = incomeBreakdown.wages.plus(wages);
          totalIncome = totalIncome.plus(wages);
        }

        // Handle 1099 data
        if (data.type === '1099-NEC' && data.nonemployeeCompensation) {
          const income = data.nonemployeeCompensation instanceof Decimal
            ? data.nonemployeeCompensation
            : new Decimal(data.nonemployeeCompensation);
          incomeBreakdown.businessIncome = incomeBreakdown.businessIncome.plus(income);
          totalIncome = totalIncome.plus(income);
        }

        // Handle manual income entries
        if (data.incomeType && data.amount) {
          const amount = data.amount instanceof Decimal ? data.amount : new Decimal(data.amount);
          const type = data.incomeType;
          if (incomeBreakdown[type]) {
            incomeBreakdown[type] = incomeBreakdown[type].plus(amount);
          } else {
            incomeBreakdown.other = incomeBreakdown.other.plus(amount);
          }
          totalIncome = totalIncome.plus(amount);
        }

        // Handle adjustments
        if (data.adjustments && Array.isArray(data.adjustments)) {
          for (const adj of data.adjustments) {
            const adjAmount = adj.amount instanceof Decimal ? adj.amount : new Decimal(adj.amount || 0);
            totalAdjustments = totalAdjustments.plus(adjAmount);
          }
        }
      }
    }

    const agi = totalIncome.minus(totalAdjustments);

    const result = {
      totalIncome: totalIncome,
      incomeBreakdown,
      totalAdjustments,
      agi,
    };

    return [this.createOutput(result)];
  }
}
