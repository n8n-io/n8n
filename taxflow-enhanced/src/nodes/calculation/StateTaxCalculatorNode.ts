import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

interface StateTaxBracket {
  min: Decimal;
  max: Decimal;
  rate: Decimal;
}

// Simplified state tax brackets for 2024 (sample states)
const STATE_TAX_BRACKETS: Record<string, StateTaxBracket[]> = {
  CA: [
    // California
    { min: new Decimal(0), max: new Decimal(10412), rate: new Decimal(0.01) },
    { min: new Decimal(10412), max: new Decimal(24684), rate: new Decimal(0.02) },
    { min: new Decimal(24684), max: new Decimal(38959), rate: new Decimal(0.04) },
    { min: new Decimal(38959), max: new Decimal(54081), rate: new Decimal(0.06) },
    { min: new Decimal(54081), max: new Decimal(68350), rate: new Decimal(0.08) },
    { min: new Decimal(68350), max: new Decimal(349137), rate: new Decimal(0.093) },
    { min: new Decimal(349137), max: new Decimal(418961), rate: new Decimal(0.103) },
    { min: new Decimal(418961), max: new Decimal(698271), rate: new Decimal(0.113) },
    { min: new Decimal(698271), max: new Decimal(Infinity), rate: new Decimal(0.123) },
  ],
  NY: [
    // New York
    { min: new Decimal(0), max: new Decimal(8500), rate: new Decimal(0.04) },
    { min: new Decimal(8500), max: new Decimal(11700), rate: new Decimal(0.045) },
    { min: new Decimal(11700), max: new Decimal(13900), rate: new Decimal(0.0525) },
    { min: new Decimal(13900), max: new Decimal(80650), rate: new Decimal(0.055) },
    { min: new Decimal(80650), max: new Decimal(215400), rate: new Decimal(0.06) },
    { min: new Decimal(215400), max: new Decimal(1077550), rate: new Decimal(0.0685) },
    { min: new Decimal(1077550), max: new Decimal(Infinity), rate: new Decimal(0.0882) },
  ],
  TX: [], // No state income tax
  FL: [], // No state income tax
  WA: [], // No state income tax
  // Add more states as needed
};

export class StateTaxCalculatorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'stateTaxCalculator',
    displayName: 'State Tax Calculator',
    group: 'calculation',
    version: 1,
    description: 'Calculate state income tax based on state-specific rules',
    inputs: ['Income Data'],
    outputs: ['State Tax Data'],
    properties: {
      state: { type: 'string', default: 'CA' },
      allowsDeductions: { type: 'boolean', default: true },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather income data
    let federalAGI = new Decimal(0);
    let stateAdjustments = new Decimal(0);

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        if (item.json.agi) {
          federalAGI = new Decimal(item.json.agi);
        }
        if (item.json.stateAdjustments) {
          stateAdjustments = new Decimal(item.json.stateAdjustments);
        }
      }
    }

    // Get state from properties
    const state = this.description.properties.state.default;

    // Calculate state AGI (often starts with federal AGI)
    const stateAGI = federalAGI.plus(stateAdjustments);

    // Get state tax brackets
    const brackets = STATE_TAX_BRACKETS[state] || [];

    if (brackets.length === 0) {
      // No state income tax
      return [
        this.createOutput({
          state,
          stateAGI,
          stateTaxableIncome: new Decimal(0),
          stateTax: new Decimal(0),
          hasIncomeTax: false,
        }),
      ];
    }

    // Calculate state standard deduction (simplified)
    const stateStandardDeduction = this.getStateStandardDeduction(
      state,
      context.filingStatus
    );

    // Calculate state taxable income
    const stateTaxableIncome = Decimal.max(
      stateAGI.minus(stateStandardDeduction),
      new Decimal(0)
    );

    // Calculate state tax using brackets
    const stateTax = this.calculateStateTax(stateTaxableIncome, brackets);

    const stateData = {
      state,
      stateAGI,
      stateStandardDeduction,
      stateTaxableIncome,
      stateTax,
      hasIncomeTax: true,
      brackets: brackets.map((b) => ({
        min: b.min.toString(),
        max: b.max.toString(),
        rate: b.rate.toString(),
      })),
    };

    return [this.createOutput(stateData)];
  }

  private calculateStateTax(
    taxableIncome: Decimal,
    brackets: StateTaxBracket[]
  ): Decimal {
    let tax = new Decimal(0);
    let remainingIncome = taxableIncome;

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      const bracketWidth = bracket.max.minus(bracket.min);

      if (remainingIncome.lte(0)) break;

      const taxableInBracket = Decimal.min(remainingIncome, bracketWidth);
      const taxForBracket = taxableInBracket.times(bracket.rate);

      tax = tax.plus(taxForBracket);
      remainingIncome = remainingIncome.minus(taxableInBracket);
    }

    return tax;
  }

  private getStateStandardDeduction(
    state: string,
    filingStatus: string
  ): Decimal {
    // Simplified state standard deductions (2024)
    const deductions: Record<string, Record<string, number>> = {
      CA: {
        single: 5363,
        married_joint: 10726,
        married_separate: 5363,
        head_of_household: 10726,
      },
      NY: {
        single: 8000,
        married_joint: 16050,
        married_separate: 8000,
        head_of_household: 11200,
      },
    };

    const stateDeductions = deductions[state];
    if (!stateDeductions) {
      return new Decimal(0);
    }

    return new Decimal(stateDeductions[filingStatus] || 0);
  }
}
