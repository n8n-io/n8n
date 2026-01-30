import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

interface TaxCredit {
  name: string;
  amount: Decimal;
  refundable: boolean;
  code: string;
}

export class TaxCreditsNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'taxCredits',
    displayName: 'Tax Credits Calculator',
    group: 'calculation',
    version: 1,
    description: 'Calculate various tax credits (Child Tax Credit, EITC, Education Credits)',
    inputs: ['Tax Data'],
    outputs: ['Credits Data'],
    properties: {
      childrenUnder17: { type: 'number', default: 0 },
      childrenUnder6: { type: 'number', default: 0 },
      otherDependents: { type: 'number', default: 0 },
      educationExpenses: { type: 'number', default: 0 },
      childCareExpenses: { type: 'number', default: 0 },
      retirementContributions: { type: 'number', default: 0 },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather AGI and tax data
    let agi = new Decimal(0);
    let totalTax = new Decimal(0);

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        if (item.json.agi) {
          agi = new Decimal(item.json.agi);
        }
        if (item.json.totalTax) {
          totalTax = new Decimal(item.json.totalTax);
        }
      }
    }

    // Get credit-related data from context or input
    const childrenUnder17 = this.description.properties.childrenUnder17.default;
    const childrenUnder6 = this.description.properties.childrenUnder6.default;
    const otherDependents = this.description.properties.otherDependents.default;
    const educationExpenses = new Decimal(
      this.description.properties.educationExpenses.default
    );
    const childCareExpenses = new Decimal(
      this.description.properties.childCareExpenses.default
    );
    const retirementContributions = new Decimal(
      this.description.properties.retirementContributions.default
    );

    const credits: TaxCredit[] = [];

    // Child Tax Credit (2024)
    const childTaxCredit = this.calculateChildTaxCredit(
      agi,
      childrenUnder17,
      childrenUnder6,
      context.filingStatus
    );
    if (childTaxCredit.gt(0)) {
      credits.push({
        name: 'Child Tax Credit',
        amount: childTaxCredit,
        refundable: true,
        code: 'CTC',
      });
    }

    // Credit for Other Dependents
    const otherDependentCredit = new Decimal(otherDependents).times(500);
    if (otherDependentCredit.gt(0)) {
      credits.push({
        name: 'Credit for Other Dependents',
        amount: otherDependentCredit,
        refundable: false,
        code: 'ODC',
      });
    }

    // Earned Income Tax Credit (EITC)
    const eitc = this.calculateEITC(agi, childrenUnder17, context.filingStatus);
    if (eitc.gt(0)) {
      credits.push({
        name: 'Earned Income Tax Credit',
        amount: eitc,
        refundable: true,
        code: 'EITC',
      });
    }

    // American Opportunity Tax Credit (education)
    const aotc = this.calculateAOTC(educationExpenses, agi, context.filingStatus);
    if (aotc.gt(0)) {
      credits.push({
        name: 'American Opportunity Tax Credit',
        amount: aotc,
        refundable: true, // 40% refundable
        code: 'AOTC',
      });
    }

    // Lifetime Learning Credit (education)
    const llc = this.calculateLLC(educationExpenses, agi, context.filingStatus);
    if (llc.gt(0) && aotc.eq(0)) {
      // Can't claim both
      credits.push({
        name: 'Lifetime Learning Credit',
        amount: llc,
        refundable: false,
        code: 'LLC',
      });
    }

    // Child and Dependent Care Credit
    const cdcc = this.calculateCDCC(childCareExpenses, agi, childrenUnder17);
    if (cdcc.gt(0)) {
      credits.push({
        name: 'Child and Dependent Care Credit',
        amount: cdcc,
        refundable: false,
        code: 'CDCC',
      });
    }

    // Saver's Credit (Retirement Savings Contributions Credit)
    const saversCredit = this.calculateSaversCredit(
      retirementContributions,
      agi,
      context.filingStatus
    );
    if (saversCredit.gt(0)) {
      credits.push({
        name: "Saver's Credit",
        amount: saversCredit,
        refundable: false,
        code: 'SAVER',
      });
    }

    // Calculate totals
    const totalNonRefundable = credits
      .filter((c) => !c.refundable)
      .reduce((sum, c) => sum.plus(c.amount), new Decimal(0));

    const totalRefundable = credits
      .filter((c) => c.refundable)
      .reduce((sum, c) => sum.plus(c.amount), new Decimal(0));

    const totalCredits = totalNonRefundable.plus(totalRefundable);

    // Non-refundable credits can only reduce tax to zero
    const nonRefundableApplied = Decimal.min(totalNonRefundable, totalTax);
    const taxAfterNonRefundable = totalTax.minus(nonRefundableApplied);

    // Refundable credits can reduce tax below zero (resulting in refund)
    const finalTax = taxAfterNonRefundable.minus(totalRefundable);

    const creditsData = {
      credits,
      totalNonRefundable,
      totalRefundable,
      totalCredits,
      nonRefundableApplied,
      taxBeforeCredits: totalTax,
      taxAfterCredits: Decimal.max(finalTax, 0),
      refundableAmount: finalTax.lt(0) ? finalTax.abs() : new Decimal(0),
    };

    return [this.createOutput(creditsData)];
  }

  private calculateChildTaxCredit(
    agi: Decimal,
    childrenUnder17: number,
    _childrenUnder6: number,
    filingStatus: string
  ): Decimal {
    if (childrenUnder17 === 0) return new Decimal(0);

    // 2024 Child Tax Credit: $2,000 per child under 17
    const baseCredit = new Decimal(2000).times(childrenUnder17);

    // Phase out thresholds (2024)
    const phaseOutStart =
      filingStatus === 'married_joint' ? new Decimal(400000) : new Decimal(200000);

    if (agi.lte(phaseOutStart)) {
      return baseCredit;
    }

    // Phase out: $50 for each $1,000 over threshold
    const excess = agi.minus(phaseOutStart);
    const phaseOutAmount = excess.div(1000).ceil().times(50);

    return Decimal.max(baseCredit.minus(phaseOutAmount), 0);
  }

  private calculateEITC(
    agi: Decimal,
    qualifyingChildren: number,
    _filingStatus: string
  ): Decimal {
    // Simplified EITC calculation for 2024
    // Full implementation would include phase-in and phase-out ranges

    const eitcLimits2024 = {
      0: { max: new Decimal(632), incomeLimit: new Decimal(18591) },
      1: { max: new Decimal(4213), incomeLimit: new Decimal(49084) },
      2: { max: new Decimal(6960), incomeLimit: new Decimal(55768) },
      3: { max: new Decimal(7830), incomeLimit: new Decimal(59899) },
    };

    const children = Math.min(qualifyingChildren, 3);
    const limit = eitcLimits2024[children as keyof typeof eitcLimits2024];

    if (agi.gt(limit.incomeLimit)) {
      return new Decimal(0);
    }

    // Simplified: return max credit if under income limit
    // Real implementation would calculate phase-in and phase-out
    return limit.max;
  }

  private calculateAOTC(
    educationExpenses: Decimal,
    agi: Decimal,
    filingStatus: string
  ): Decimal {
    // American Opportunity Tax Credit: 100% of first $2,000 + 25% of next $2,000
    const maxCredit = new Decimal(2500);

    const credit = Decimal.min(
      new Decimal(2000).plus(educationExpenses.minus(2000).times(0.25)),
      maxCredit
    );

    // Phase out: $80,000-$90,000 (single), $160,000-$180,000 (married)
    const phaseOutStart =
      filingStatus === 'married_joint' ? new Decimal(160000) : new Decimal(80000);
    const phaseOutEnd =
      filingStatus === 'married_joint' ? new Decimal(180000) : new Decimal(90000);

    if (agi.gte(phaseOutEnd)) return new Decimal(0);
    if (agi.lte(phaseOutStart)) return Decimal.max(credit, 0);

    const phaseOutRatio = agi.minus(phaseOutStart).div(phaseOutEnd.minus(phaseOutStart));
    return credit.times(new Decimal(1).minus(phaseOutRatio));
  }

  private calculateLLC(
    educationExpenses: Decimal,
    agi: Decimal,
    filingStatus: string
  ): Decimal {
    // Lifetime Learning Credit: 20% of up to $10,000
    const credit = Decimal.min(educationExpenses.times(0.2), new Decimal(2000));

    // Phase out: $80,000-$90,000 (single), $160,000-$180,000 (married)
    const phaseOutStart =
      filingStatus === 'married_joint' ? new Decimal(160000) : new Decimal(80000);
    const phaseOutEnd =
      filingStatus === 'married_joint' ? new Decimal(180000) : new Decimal(90000);

    if (agi.gte(phaseOutEnd)) return new Decimal(0);
    if (agi.lte(phaseOutStart)) return credit;

    const phaseOutRatio = agi.minus(phaseOutStart).div(phaseOutEnd.minus(phaseOutStart));
    return credit.times(new Decimal(1).minus(phaseOutRatio));
  }

  private calculateCDCC(
    childCareExpenses: Decimal,
    agi: Decimal,
    children: number
  ): Decimal {
    if (children === 0) return new Decimal(0);

    // Maximum expenses: $3,000 for 1 child, $6,000 for 2+
    const maxExpenses = children === 1 ? new Decimal(3000) : new Decimal(6000);
    const qualifiedExpenses = Decimal.min(childCareExpenses, maxExpenses);

    // Credit rate: 20-35% based on AGI
    let creditRate = new Decimal(0.35);
    if (agi.gt(15000)) {
      const reduction = agi.minus(15000).div(2000).floor().times(0.01);
      creditRate = Decimal.max(new Decimal(0.20), creditRate.minus(reduction));
    }

    return qualifiedExpenses.times(creditRate);
  }

  private calculateSaversCredit(
    contributions: Decimal,
    agi: Decimal,
    filingStatus: string
  ): Decimal {
    // Saver's Credit: 10%, 20%, or 50% of up to $2,000 contribution
    const maxContribution = new Decimal(2000);
    const qualifiedContribution = Decimal.min(contributions, maxContribution);

    // AGI limits and rates for 2024
    const limits =
      filingStatus === 'married_joint'
        ? { low: new Decimal(46000), mid: new Decimal(50000), high: new Decimal(76500) }
        : { low: new Decimal(23000), mid: new Decimal(25000), high: new Decimal(38250) };

    let rate = new Decimal(0);
    if (agi.lte(limits.low)) {
      rate = new Decimal(0.5);
    } else if (agi.lte(limits.mid)) {
      rate = new Decimal(0.2);
    } else if (agi.lte(limits.high)) {
      rate = new Decimal(0.1);
    }

    return qualifiedContribution.times(rate);
  }
}
