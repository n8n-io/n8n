import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class ScheduleAGeneratorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'scheduleAGenerator',
    displayName: 'Schedule A Generator',
    group: 'forms',
    version: 1,
    description: 'Generate Schedule A (Itemized Deductions)',
    inputs: ['Deduction Data'],
    outputs: ['Schedule A'],
    properties: {
      outputFormat: { type: 'string', default: 'json' },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather itemized deduction data
    let medicalExpenses = new Decimal(0);
    let stateAndLocalTaxes = new Decimal(0);
    let mortgageInterest = new Decimal(0);
    let charitableContributions = new Decimal(0);
    let casualtyLosses = new Decimal(0);
    let otherDeductions = new Decimal(0);
    let agi = new Decimal(0);

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        if (item.json.type === 'itemized_deduction') {
          const category = item.json.category;
          const amount = new Decimal(item.json.amount);

          switch (category) {
            case 'medical':
              medicalExpenses = medicalExpenses.plus(amount);
              break;
            case 'state_local_tax':
              stateAndLocalTaxes = stateAndLocalTaxes.plus(amount);
              break;
            case 'mortgage_interest':
              mortgageInterest = mortgageInterest.plus(amount);
              break;
            case 'charitable':
              charitableContributions = charitableContributions.plus(amount);
              break;
            case 'casualty':
              casualtyLosses = casualtyLosses.plus(amount);
              break;
            default:
              otherDeductions = otherDeductions.plus(amount);
          }
        }

        if (item.json.agi) {
          agi = new Decimal(item.json.agi);
        }

        // Also accept pre-aggregated data
        if (item.json.medicalExpenses) {
          medicalExpenses = medicalExpenses.plus(new Decimal(item.json.medicalExpenses));
        }
        if (item.json.stateAndLocalTaxes) {
          stateAndLocalTaxes = stateAndLocalTaxes.plus(
            new Decimal(item.json.stateAndLocalTaxes)
          );
        }
        if (item.json.mortgageInterest) {
          mortgageInterest = mortgageInterest.plus(new Decimal(item.json.mortgageInterest));
        }
        if (item.json.charitableContributions) {
          charitableContributions = charitableContributions.plus(
            new Decimal(item.json.charitableContributions)
          );
        }
      }
    }

    // Line 1: Medical and dental expenses (only amount over 7.5% of AGI)
    const medicalThreshold = agi.times(0.075);
    const deductibleMedical = Decimal.max(medicalExpenses.minus(medicalThreshold), 0);

    // Line 2-4: Taxes (SALT cap of $10,000)
    const saltCap = new Decimal(10000);
    const deductibleSALT = Decimal.min(stateAndLocalTaxes, saltCap);

    // Line 5-7: Interest
    const deductibleInterest = mortgageInterest; // Simplified

    // Line 8-13: Charitable contributions
    const deductibleCharitable = charitableContributions; // Simplified

    // Line 14-15: Casualty and theft losses
    const deductibleCasualty = casualtyLosses; // Simplified

    // Line 16: Other itemized deductions
    const deductibleOther = otherDeductions;

    // Total itemized deductions
    const totalItemizedDeductions = deductibleMedical
      .plus(deductibleSALT)
      .plus(deductibleInterest)
      .plus(deductibleCharitable)
      .plus(deductibleCasualty)
      .plus(deductibleOther);

    const scheduleA = {
      taxYear: context.taxYear,
      filingStatus: context.filingStatus,
      taxpayer: context.taxpayerInfo,

      // Medical and dental expenses
      medicalExpenses,
      medicalThreshold,
      deductibleMedical,

      // Taxes
      stateAndLocalTaxes,
      saltCap,
      deductibleSALT,
      saltCapExceeded: stateAndLocalTaxes.gt(saltCap),

      // Interest
      mortgageInterest,
      deductibleInterest,

      // Charitable contributions
      charitableContributions,
      deductibleCharitable,

      // Casualty and theft losses
      casualtyLosses,
      deductibleCasualty,

      // Other deductions
      otherDeductions,
      deductibleOther,

      // Total
      totalItemizedDeductions,

      // For comparison
      agi,
    };

    return [this.createOutput(scheduleA)];
  }
}
