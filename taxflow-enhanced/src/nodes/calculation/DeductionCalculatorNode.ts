import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';
import { IRSRulesEngine } from '../../core/rules/IRSRulesEngine';

export class DeductionCalculatorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'deductionCalculator',
    displayName: 'Deduction Calculator',
    group: 'calculation',
    version: 1,
    description: 'Calculate standard or itemized deductions',
    inputs: ['AGI Data', 'Itemized Deductions (Optional)'],
    outputs: ['Deduction Data'],
    properties: {
      forceStandard: { type: 'boolean', default: false },
      forceItemized: { type: 'boolean', default: false },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    const agiInput = this.getFirstInput(inputData);
    const agi = agiInput.json.agi instanceof Decimal
      ? agiInput.json.agi
      : new Decimal(agiInput.json.agi || 0);

    // Get standard deduction for filing status
    const standardDeduction = IRSRulesEngine.getStandardDeduction(context.filingStatus);

    // Calculate itemized deductions if provided
    let itemizedTotal = new Decimal(0);
    const itemizedBreakdown: Record<string, Decimal> = {};

    if (inputData.length > 1 && inputData[1] && inputData[1][0]) {
      const itemizedData = inputData[1][0].json;

      // Medical expenses
      if (itemizedData.medicalExpenses) {
        const medical = new Decimal(itemizedData.medicalExpenses);
        // Medical expenses must exceed 7.5% of AGI
        const threshold = agi.times(0.075);
        const deductible = Decimal.max(medical.minus(threshold), 0);
        itemizedBreakdown.medicalExpenses = deductible;
        itemizedTotal = itemizedTotal.plus(deductible);
      }

      // State and local taxes (SALT cap applies)
      if (itemizedData.stateAndLocalTaxes) {
        const salt = new Decimal(itemizedData.stateAndLocalTaxes);
        const cappedSalt = IRSRulesEngine.applySALTCap(salt);
        itemizedBreakdown.stateAndLocalTaxes = cappedSalt;
        itemizedTotal = itemizedTotal.plus(cappedSalt);
      }

      // Mortgage interest
      if (itemizedData.mortgageInterest) {
        const mortgage = new Decimal(itemizedData.mortgageInterest);
        itemizedBreakdown.mortgageInterest = mortgage;
        itemizedTotal = itemizedTotal.plus(mortgage);
      }

      // Charitable contributions
      if (itemizedData.charitableContributions) {
        const charity = new Decimal(itemizedData.charitableContributions);
        itemizedBreakdown.charitableContributions = charity;
        itemizedTotal = itemizedTotal.plus(charity);
      }
    }

    // Choose the higher deduction
    const useItemized = itemizedTotal.gt(standardDeduction);
    const deductionAmount = useItemized ? itemizedTotal : standardDeduction;
    const deductionType = useItemized ? 'itemized' : 'standard';

    // Calculate taxable income
    const taxableIncome = Decimal.max(agi.minus(deductionAmount), 0);

    const result = {
      agi,
      deductionType,
      deductionAmount,
      standardDeduction,
      itemizedTotal,
      itemizedBreakdown: useItemized ? itemizedBreakdown : undefined,
      taxableIncome,
    };

    return [this.createOutput(result)];
  }
}
