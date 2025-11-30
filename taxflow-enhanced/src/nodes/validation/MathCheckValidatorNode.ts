import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  expected?: string;
  actual?: string;
}

export class MathCheckValidatorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'mathCheckValidator',
    displayName: 'Math Check Validator',
    group: 'validation',
    version: 1,
    description: 'Validate mathematical accuracy and consistency across all forms',
    inputs: ['All Tax Data'],
    outputs: ['Validation Report'],
    properties: {
      strictMode: { type: 'boolean', default: true },
      tolerance: { type: 'number', default: 0.01 }, // Tolerance for rounding differences
    },
  };

  async execute(
    _context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Collect all relevant data
    const data = this.collectData(inputData);

    // 1. Validate income totals
    this.validateIncome(data, errors, warnings);

    // 2. Validate AGI calculation
    this.validateAGI(data, errors, warnings);

    // 3. Validate deductions
    this.validateDeductions(data, errors, warnings);

    // 4. Validate taxable income
    this.validateTaxableIncome(data, errors, warnings);

    // 5. Validate tax calculation
    this.validateTax(data, errors, warnings);

    // 6. Validate credits
    this.validateCredits(data, errors, warnings);

    // 7. Validate self-employment tax
    this.validateSETax(data, errors, warnings);

    // 8. Cross-validate forms
    this.crossValidateForms(data, errors, warnings);

    const validationReport = {
      isValid: errors.length === 0,
      hasWarnings: warnings.length > 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
      timestamp: Date.now(),
      validatedData: data,
    };

    return [this.createOutput(validationReport)];
  }

  private collectData(inputData: TaxData[][]): any {
    const data: any = {
      w2: [],
      form1099: [],
      income: {},
      agi: null,
      deductions: {},
      taxableIncome: null,
      tax: {},
      credits: {},
      seTax: {},
      schedules: {},
    };

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        const json = item.json;

        if (json.type === 'w2') {
          data.w2.push(json);
        } else if (json.type?.startsWith('1099')) {
          data.form1099.push(json);
        } else if (json.totalIncome || json.incomeBreakdown) {
          data.income = json;
        } else if (json.agi) {
          data.agi = json.agi;
        } else if (json.deductionType || json.deductionAmount) {
          data.deductions = json;
        } else if (json.taxableIncome !== undefined) {
          data.taxableIncome = json.taxableIncome;
        } else if (json.totalTax) {
          data.tax = json;
        } else if (json.credits || json.totalCredits) {
          data.credits = json;
        } else if (json.totalSETax) {
          data.seTax = json;
        } else if (json.netBusinessIncome && json.grossIncome) {
          data.schedules.scheduleC = json;
        }
      }
    }

    return data;
  }

  private validateIncome(data: any, errors: ValidationError[], _warnings: ValidationError[]) {
    // Validate W-2 totals
    let totalW2Wages = new Decimal(0);
    for (const w2 of data.w2) {
      if (w2.wages) {
        totalW2Wages = totalW2Wages.plus(new Decimal(w2.wages));
      }
    }

    // Check if W-2 wages match income breakdown
    if (data.income.incomeBreakdown?.wages) {
      const reportedWages = new Decimal(data.income.incomeBreakdown.wages);
      if (!this.isClose(totalW2Wages, reportedWages)) {
        errors.push({
          code: 'W2_WAGES_MISMATCH',
          field: 'wages',
          message: 'Total W-2 wages do not match reported income',
          severity: 'error',
          expected: totalW2Wages.toString(),
          actual: reportedWages.toString(),
        });
      }
    }
  }

  private validateAGI(data: any, errors: ValidationError[], _warnings: ValidationError[]) {
    if (!data.income.totalIncome || !data.agi) return;

    const totalIncome = new Decimal(data.income.totalIncome);
    const adjustments = data.income.totalAdjustments
      ? new Decimal(data.income.totalAdjustments)
      : new Decimal(0);
    const expectedAGI = totalIncome.minus(adjustments);
    const actualAGI = new Decimal(data.agi);

    if (!this.isClose(expectedAGI, actualAGI)) {
      errors.push({
        code: 'AGI_CALCULATION_ERROR',
        field: 'agi',
        message: 'AGI calculation is incorrect',
        severity: 'error',
        expected: expectedAGI.toString(),
        actual: actualAGI.toString(),
      });
    }
  }

  private validateDeductions(data: any, _errors: ValidationError[], warnings: ValidationError[]) {
    // Validate SALT cap
    if (data.deductions.itemizedBreakdown?.stateAndLocalTaxes) {
      const salt = new Decimal(data.deductions.itemizedBreakdown.stateAndLocalTaxes);
      if (salt.gt(10000)) {
        warnings.push({
          code: 'SALT_CAP_EXCEEDED',
          field: 'stateAndLocalTaxes',
          message: 'SALT deduction exceeds $10,000 cap - should be limited',
          severity: 'warning',
          expected: '10000',
          actual: salt.toString(),
        });
      }
    }
  }

  private validateTaxableIncome(data: any, errors: ValidationError[], _warnings: ValidationError[]) {
    if (!data.agi || !data.deductions.deductionAmount || data.taxableIncome === null) return;

    const agi = new Decimal(data.agi);
    const deduction = new Decimal(data.deductions.deductionAmount);
    const expectedTaxableIncome = Decimal.max(agi.minus(deduction), 0);
    const actualTaxableIncome = new Decimal(data.taxableIncome);

    if (!this.isClose(expectedTaxableIncome, actualTaxableIncome)) {
      errors.push({
        code: 'TAXABLE_INCOME_ERROR',
        field: 'taxableIncome',
        message: 'Taxable income calculation is incorrect',
        severity: 'error',
        expected: expectedTaxableIncome.toString(),
        actual: actualTaxableIncome.toString(),
      });
    }
  }

  private validateTax(_data: any, _errors: ValidationError[], _warnings: ValidationError[]) {
    // Tax validation is handled by IRSValidatorNode
    // This is a placeholder for additional math checks
  }

  private validateCredits(data: any, errors: ValidationError[], _warnings: ValidationError[]) {
    if (!data.credits.credits) return;

    // Validate total credits calculation
    let calculatedTotal = new Decimal(0);
    for (const credit of data.credits.credits) {
      calculatedTotal = calculatedTotal.plus(new Decimal(credit.amount));
    }

    if (data.credits.totalCredits) {
      const reportedTotal = new Decimal(data.credits.totalCredits);
      if (!this.isClose(calculatedTotal, reportedTotal)) {
        errors.push({
          code: 'CREDITS_TOTAL_ERROR',
          field: 'totalCredits',
          message: 'Total credits calculation is incorrect',
          severity: 'error',
          expected: calculatedTotal.toString(),
          actual: reportedTotal.toString(),
        });
      }
    }
  }

  private validateSETax(data: any, errors: ValidationError[], _warnings: ValidationError[]) {
    if (!data.seTax.netBusinessIncome) return;

    const netIncome = new Decimal(data.seTax.netBusinessIncome);
    const expectedSEEarnings = netIncome.times(0.9235);

    if (data.seTax.seEarnings) {
      const actualSEEarnings = new Decimal(data.seTax.seEarnings);
      if (!this.isClose(expectedSEEarnings, actualSEEarnings)) {
        errors.push({
          code: 'SE_EARNINGS_ERROR',
          field: 'seEarnings',
          message: 'Self-employment earnings calculation is incorrect',
          severity: 'error',
          expected: expectedSEEarnings.toString(),
          actual: actualSEEarnings.toString(),
        });
      }
    }

    // Validate deductible SE tax (should be 50% of total)
    if (data.seTax.totalSETax && data.seTax.deductibleSETax) {
      const totalSETax = new Decimal(data.seTax.totalSETax);
      const expectedDeductible = totalSETax.times(0.5);
      const actualDeductible = new Decimal(data.seTax.deductibleSETax);

      if (!this.isClose(expectedDeductible, actualDeductible)) {
        errors.push({
          code: 'SE_DEDUCTION_ERROR',
          field: 'deductibleSETax',
          message: 'Deductible SE tax should be 50% of total SE tax',
          severity: 'error',
          expected: expectedDeductible.toString(),
          actual: actualDeductible.toString(),
        });
      }
    }
  }

  private crossValidateForms(data: any, _errors: ValidationError[], warnings: ValidationError[]) {
    // Cross-validate Schedule C with Schedule SE
    if (data.schedules.scheduleC && data.seTax.netBusinessIncome) {
      const scheduleCIncome = new Decimal(data.schedules.scheduleC.netBusinessIncome);
      const seIncome = new Decimal(data.seTax.netBusinessIncome);

      if (!this.isClose(scheduleCIncome, seIncome)) {
        warnings.push({
          code: 'SCHEDULE_C_SE_MISMATCH',
          field: 'netBusinessIncome',
          message: 'Schedule C net income should match Schedule SE',
          severity: 'warning',
          expected: scheduleCIncome.toString(),
          actual: seIncome.toString(),
        });
      }
    }
  }

  private isClose(a: Decimal, b: Decimal, tolerance: number = 0.01): boolean {
    return a.minus(b).abs().lte(tolerance);
  }
}
