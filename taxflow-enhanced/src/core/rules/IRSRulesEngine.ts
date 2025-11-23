import Decimal from 'decimal.js';
import { TAX_BRACKETS_2024, STANDARD_DEDUCTIONS_2024 } from '../../constants/taxBrackets';

/**
 * IRS tax rules and calculation engine
 *
 * Provides methods for calculating federal income tax, standard deductions,
 * and validating tax calculations according to IRS rules for tax year 2024.
 *
 * All calculations use Decimal.js for precision to avoid floating-point errors.
 *
 * @example
 * ```typescript
 * const taxableIncome = new Decimal(75000);
 * const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');
 * console.log(`Tax owed: ${tax}`); // $11,663
 *
 * const deduction = IRSRulesEngine.getStandardDeduction('single');
 * console.log(`Standard deduction: ${deduction}`); // $14,600
 * ```
 */
export class IRSRulesEngine {
  /**
   * Calculates federal income tax using progressive tax brackets
   *
   * Uses 2024 IRS tax brackets to calculate tax on taxable income.
   * Automatically handles negative income by returning zero tax.
   *
   * @param taxableIncome - Income after deductions (must be >= 0)
   * @param filingStatus - Filing status: 'single', 'married_joint', 'married_separate', or 'head_of_household'
   * @returns Calculated federal income tax
   * @throws Error if filing status is invalid
   *
   * @example
   * ```typescript
   * // Single filer with $75,000 taxable income
   * const tax = IRSRulesEngine.calculateTax(new Decimal(75000), 'single');
   * // Returns approximately $11,663
   * ```
   */
  static calculateTax(
    taxableIncome: Decimal,
    filingStatus: string
  ): Decimal {
    const brackets = TAX_BRACKETS_2024[filingStatus];
    if (!brackets) {
      throw new Error(`Invalid filing status: ${filingStatus}`);
    }

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

  /**
   * Gets the standard deduction amount for a filing status
   *
   * Returns the 2024 standard deduction amount based on filing status.
   * Returns zero for invalid filing statuses.
   *
   * @param filingStatus - Filing status: 'single', 'married_joint', 'married_separate', or 'head_of_household'
   * @returns Standard deduction amount for 2024
   *
   * @example
   * ```typescript
   * const deduction = IRSRulesEngine.getStandardDeduction('single');
   * // Returns $14,600
   *
   * const marriedDeduction = IRSRulesEngine.getStandardDeduction('married_joint');
   * // Returns $29,200
   * ```
   */
  static getStandardDeduction(filingStatus: string): Decimal {
    return STANDARD_DEDUCTIONS_2024[filingStatus] || new Decimal(0);
  }

  /**
   * Validates that AGI calculation is correct
   *
   * Verifies: AGI = Total Income - Adjustments to Income
   *
   * @param totalIncome - Total income from all sources
   * @param adjustments - Sum of all adjustments to income (e.g., IRA contributions, student loan interest)
   * @param agi - Adjusted Gross Income to validate
   * @returns true if AGI calculation is correct, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = IRSRulesEngine.validateAGI(
   *   new Decimal(100000),  // Total income
   *   new Decimal(5000),    // Adjustments
   *   new Decimal(95000)    // AGI
   * );
   * // Returns true
   * ```
   */
  static validateAGI(
    totalIncome: Decimal,
    adjustments: Decimal,
    agi: Decimal
  ): boolean {
    const calculatedAGI = totalIncome.minus(adjustments);
    return calculatedAGI.equals(agi);
  }

  /**
   * Validates that taxable income calculation is correct
   *
   * Verifies: Taxable Income = max(AGI - Deduction, 0)
   * Taxable income cannot be negative.
   *
   * @param agi - Adjusted Gross Income
   * @param deduction - Standard or itemized deduction amount
   * @param taxableIncome - Taxable income to validate
   * @returns true if taxable income calculation is correct, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = IRSRulesEngine.validateTaxableIncome(
   *   new Decimal(95000),   // AGI
   *   new Decimal(14600),   // Standard deduction
   *   new Decimal(80400)    // Taxable income
   * );
   * // Returns true
   * ```
   */
  static validateTaxableIncome(
    agi: Decimal,
    deduction: Decimal,
    taxableIncome: Decimal
  ): boolean {
    const calculated = Decimal.max(agi.minus(deduction), 0);
    return calculated.equals(taxableIncome);
  }

  /**
   * Applies the SALT (State and Local Tax) deduction cap
   *
   * The TCJA limits state and local tax deductions to $10,000.
   * This method caps the deduction at $10,000 regardless of actual amount paid.
   *
   * @param stateAndLocalTaxes - Total state and local taxes paid
   * @returns Capped deduction amount (max $10,000)
   *
   * @example
   * ```typescript
   * const capped = IRSRulesEngine.applySALTCap(new Decimal(25000));
   * // Returns $10,000 (capped)
   *
   * const uncapped = IRSRulesEngine.applySALTCap(new Decimal(5000));
   * // Returns $5,000 (under cap)
   * ```
   */
  static applySALTCap(stateAndLocalTaxes: Decimal): Decimal {
    const SALT_CAP = new Decimal(10000);
    return Decimal.min(stateAndLocalTaxes, SALT_CAP);
  }
}
