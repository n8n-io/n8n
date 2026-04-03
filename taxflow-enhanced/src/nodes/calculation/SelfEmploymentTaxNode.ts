import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class SelfEmploymentTaxNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'selfEmploymentTax',
    displayName: 'Self-Employment Tax Calculator',
    group: 'calculation',
    version: 1,
    description: 'Calculate self-employment tax (Social Security + Medicare) for Schedule SE',
    inputs: ['Business Income Data'],
    outputs: ['SE Tax Data'],
    properties: {
      ministerialIncome: { type: 'boolean', default: false },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather self-employment income
    let netBusinessIncome = new Decimal(0);
    let grossRevenue = new Decimal(0);
    let businessExpenses = new Decimal(0);

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        // From 1099-NEC or Schedule C
        if (item.json.nonemployeeCompensation) {
          netBusinessIncome = netBusinessIncome.plus(
            new Decimal(item.json.nonemployeeCompensation)
          );
        }
        if (item.json.netBusinessIncome) {
          netBusinessIncome = netBusinessIncome.plus(
            new Decimal(item.json.netBusinessIncome)
          );
        }
        if (item.json.grossRevenue) {
          grossRevenue = grossRevenue.plus(new Decimal(item.json.grossRevenue));
        }
        if (item.json.businessExpenses) {
          businessExpenses = businessExpenses.plus(new Decimal(item.json.businessExpenses));
        }
      }
    }

    // If net business income not provided, calculate it
    if (netBusinessIncome.eq(0) && grossRevenue.gt(0)) {
      netBusinessIncome = grossRevenue.minus(businessExpenses);
    }

    // Calculate self-employment earnings (92.35% of net profit)
    const seEarnings = netBusinessIncome.times(0.9235);

    // 2024 Social Security wage base limit
    const ssWageBase = new Decimal(168600);

    // Social Security tax: 12.4% of earnings up to wage base
    const ssEarnings = Decimal.min(seEarnings, ssWageBase);
    const socialSecurityTax = ssEarnings.times(0.124);

    // Medicare tax: 2.9% of all earnings
    const medicareTax = seEarnings.times(0.029);

    // Additional Medicare tax: 0.9% on earnings over threshold
    const additionalMedicareThreshold =
      context.filingStatus === 'married_joint'
        ? new Decimal(250000)
        : context.filingStatus === 'married_separate'
        ? new Decimal(125000)
        : new Decimal(200000);

    let additionalMedicareTax = new Decimal(0);
    if (seEarnings.gt(additionalMedicareThreshold)) {
      additionalMedicareTax = seEarnings
        .minus(additionalMedicareThreshold)
        .times(0.009);
    }

    // Total self-employment tax
    const totalSETax = socialSecurityTax
      .plus(medicareTax)
      .plus(additionalMedicareTax);

    // Deductible portion (50% of SE tax)
    const deductibleSETax = totalSETax.times(0.5);

    const seData = {
      netBusinessIncome,
      seEarnings,
      socialSecurityTax,
      medicareTax,
      additionalMedicareTax,
      totalSETax,
      deductibleSETax,
      ssWageBaseUsed: ssEarnings,
      ssWageBaseLimit: ssWageBase,
    };

    return [this.createOutput(seData)];
  }
}
