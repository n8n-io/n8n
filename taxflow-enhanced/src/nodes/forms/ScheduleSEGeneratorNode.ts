import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class ScheduleSEGeneratorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'scheduleSEGenerator',
    displayName: 'Schedule SE Generator',
    group: 'forms',
    version: 1,
    description: 'Generate Schedule SE (Self-Employment Tax)',
    inputs: ['SE Tax Data'],
    outputs: ['Schedule SE'],
    properties: {
      outputFormat: { type: 'string', default: 'json' },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather self-employment income and tax data
    let netBusinessIncome = new Decimal(0);
    let seEarnings = new Decimal(0);
    let socialSecurityTax = new Decimal(0);
    let medicareTax = new Decimal(0);
    let additionalMedicareTax = new Decimal(0);
    let totalSETax = new Decimal(0);
    let deductibleSETax = new Decimal(0);

    // Also track if we have W-2 wages for coordination
    let w2Wages = new Decimal(0);
    let w2SSWages = new Decimal(0);

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        // Self-employment data
        if (item.json.netBusinessIncome) {
          netBusinessIncome = netBusinessIncome.plus(
            new Decimal(item.json.netBusinessIncome)
          );
        }
        if (item.json.seEarnings) {
          seEarnings = seEarnings.plus(new Decimal(item.json.seEarnings));
        }
        if (item.json.socialSecurityTax) {
          socialSecurityTax = socialSecurityTax.plus(
            new Decimal(item.json.socialSecurityTax)
          );
        }
        if (item.json.medicareTax) {
          medicareTax = medicareTax.plus(new Decimal(item.json.medicareTax));
        }
        if (item.json.additionalMedicareTax) {
          additionalMedicareTax = additionalMedicareTax.plus(
            new Decimal(item.json.additionalMedicareTax)
          );
        }
        if (item.json.totalSETax) {
          totalSETax = totalSETax.plus(new Decimal(item.json.totalSETax));
        }
        if (item.json.deductibleSETax) {
          deductibleSETax = deductibleSETax.plus(new Decimal(item.json.deductibleSETax));
        }

        // W-2 wages for coordination
        if (item.json.wages) {
          w2Wages = w2Wages.plus(new Decimal(item.json.wages));
        }
        if (item.json.socialSecurityWages) {
          w2SSWages = w2SSWages.plus(new Decimal(item.json.socialSecurityWages));
        }
      }
    }

    // If SE data wasn't pre-calculated, calculate it now
    if (totalSETax.eq(0) && netBusinessIncome.gt(0)) {
      // Short Schedule SE calculation
      seEarnings = netBusinessIncome.times(0.9235);

      const ssWageBase = new Decimal(168600);
      const remainingSSBase = Decimal.max(ssWageBase.minus(w2SSWages), 0);
      const ssEarnings = Decimal.min(seEarnings, remainingSSBase);

      socialSecurityTax = ssEarnings.times(0.124);
      medicareTax = seEarnings.times(0.029);

      // Additional Medicare tax
      const additionalMedicareThreshold =
        context.filingStatus === 'married_joint'
          ? new Decimal(250000)
          : context.filingStatus === 'married_separate'
          ? new Decimal(125000)
          : new Decimal(200000);

      const combinedMedicareWages = w2Wages.plus(seEarnings);
      if (combinedMedicareWages.gt(additionalMedicareThreshold)) {
        const excessWages = combinedMedicareWages.minus(additionalMedicareThreshold);
        const sePortionOfExcess = Decimal.min(excessWages, seEarnings);
        additionalMedicareTax = sePortionOfExcess.times(0.009);
      }

      totalSETax = socialSecurityTax.plus(medicareTax).plus(additionalMedicareTax);
      deductibleSETax = totalSETax.times(0.5);
    }

    const scheduleSE = {
      taxYear: context.taxYear,
      filingStatus: context.filingStatus,
      taxpayer: context.taxpayerInfo,

      // Part I: Self-Employment Tax
      // Line 2: Net farm profit or (loss)
      netFarmIncome: new Decimal(0), // Not implemented

      // Line 3: Net profit or (loss) from Schedule C
      netBusinessIncome,

      // Line 4: Combine lines 2 and 3
      combinedNetEarnings: netBusinessIncome,

      // Line 5: Skip if less than $400
      requiresScheduleSE: netBusinessIncome.gte(400),

      // Part II: Optional methods (not implemented)
      useOptionalMethods: false,

      // Part III: Maximum Deferral of Self-Employment Tax (not implemented)

      // Section A: Short Schedule SE
      // Line 1a-1c: Net profit/loss
      netProfit: netBusinessIncome,

      // Line 2: Multiply line 1 by 92.35% (0.9235)
      seEarnings,

      // Line 3: Self-employment tax
      socialSecurityTax,
      medicareTax,
      additionalMedicareTax,
      totalSETax,

      // Line 4: Deduction for one-half of self-employment tax
      deductibleSETax,

      // Coordination with W-2 wages
      w2Wages,
      w2SSWages,

      // Additional information
      ssWageBase: new Decimal(168600),
      effectiveSERate: netBusinessIncome.gt(0)
        ? totalSETax.div(netBusinessIncome).times(100)
        : new Decimal(0),
    };

    return [this.createOutput(scheduleSE)];
  }
}
