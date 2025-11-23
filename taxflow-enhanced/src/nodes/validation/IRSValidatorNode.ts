import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';
import { IRSRulesEngine } from '../../core/rules/IRSRulesEngine';

interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class IRSValidatorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'irsValidator',
    displayName: 'IRS Rules Validator',
    group: 'validation',
    version: 1,
    description: 'Validate tax return against IRS rules',
    inputs: ['Form 1040 Data'],
    outputs: ['Validation Results'],
    properties: {
      stopOnError: { type: 'boolean', default: false },
      includeWarnings: { type: 'boolean', default: true },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    const form1040 = this.getFirstInput(inputData).json;
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate AGI calculation
    if (form1040.income && form1040.agi) {
      const totalIncome = form1040.income.totalIncome instanceof Decimal
        ? form1040.income.totalIncome
        : new Decimal(form1040.income.totalIncome || 0);

      const adjustments = form1040.adjustments && form1040.adjustments.length > 0
        ? form1040.adjustments.reduce((sum: Decimal, adj: any) => {
            const amount = adj.amount instanceof Decimal ? adj.amount : new Decimal(adj.amount || 0);
            return sum.plus(amount);
          }, new Decimal(0))
        : new Decimal(0);

      const agi = form1040.agi instanceof Decimal ? form1040.agi : new Decimal(form1040.agi || 0);

      const isValid = IRSRulesEngine.validateAGI(totalIncome, adjustments, agi);
      if (!isValid) {
        errors.push({
          code: 'AGI_MISMATCH',
          field: 'agi',
          message: `AGI calculation error. Total Income: ${totalIncome}, Adjustments: ${adjustments}, AGI: ${agi}`,
          severity: 'error',
        });
      }
    }

    // Validate taxable income calculation
    if (form1040.agi && form1040.deductions && form1040.taxableIncome) {
      const agi = form1040.agi instanceof Decimal ? form1040.agi : new Decimal(form1040.agi || 0);
      const deduction = form1040.deductions.amount instanceof Decimal
        ? form1040.deductions.amount
        : new Decimal(form1040.deductions.amount || 0);
      const taxableIncome = form1040.taxableIncome instanceof Decimal
        ? form1040.taxableIncome
        : new Decimal(form1040.taxableIncome || 0);

      const isValid = IRSRulesEngine.validateTaxableIncome(agi, deduction, taxableIncome);
      if (!isValid) {
        errors.push({
          code: 'TAXABLE_INCOME_MISMATCH',
          field: 'taxableIncome',
          message: `Taxable income calculation error. AGI: ${agi}, Deduction: ${deduction}, Taxable Income: ${taxableIncome}`,
          severity: 'error',
        });
      }
    }

    // Check SALT cap if itemized
    if (form1040.deductions?.type === 'itemized' && form1040.deductions?.itemizedBreakdown) {
      const saltAmount = form1040.deductions.itemizedBreakdown.stateAndLocalTaxes;
      if (saltAmount && saltAmount instanceof Decimal && saltAmount.gt(10000)) {
        warnings.push({
          code: 'SALT_CAP_EXCEEDED',
          field: 'deductions.itemizedBreakdown.stateAndLocalTaxes',
          message: `SALT deduction exceeds $10,000 cap. Amount: ${saltAmount}`,
          severity: 'warning',
        });
      }
    }

    // Check if standard deduction would be better
    if (form1040.deductions?.type === 'itemized') {
      const standardDeduction = IRSRulesEngine.getStandardDeduction(context.filingStatus);
      const itemizedAmount = form1040.deductions.amount instanceof Decimal
        ? form1040.deductions.amount
        : new Decimal(form1040.deductions.amount || 0);

      if (itemizedAmount.lt(standardDeduction)) {
        warnings.push({
          code: 'SUBOPTIMAL_DEDUCTION',
          field: 'deductions.type',
          message: `Standard deduction ($${standardDeduction}) exceeds itemized ($${itemizedAmount})`,
          severity: 'warning',
        });
      }
    }

    const result = {
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
      validatedData: form1040,
    };

    return [this.createOutput(result)];
  }
}
